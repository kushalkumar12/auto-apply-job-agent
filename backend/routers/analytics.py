from fastapi import APIRouter, Depends, Query, HTTPException
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import math

try:
    from ..database import get_db
    from ..services.auth_service import get_current_user
except (ImportError, ValueError):
    from database import get_db
    from services.auth_service import get_current_user

router = APIRouter(tags=["Analytics"])

def generate_dynamic_heatmap_and_metrics(conn, user_id: Optional[str] = None, profile_id: Optional[str] = None):
    """
    Computes 365-day activity ledger and metrics directly from SQLite database records
    scoped strictly to the authenticated user and their active/selected profile.
    When brand new, returns 0s and empty maps without any artificial or mock data.
    """
    now = datetime.now()
    
    # Pristine 0 fallback for unauthenticated or brand new sessions
    if not user_id:
        timeline_bars = []
        for i in range(6, -1, -1):
            d = now - timedelta(days=i)
            d_str = d.strftime("%Y-%m-%d")
            timeline_bars.append({
                "day": d.strftime("%b %d"),
                "date": d_str,
                "formattedDate": d_str,
                "count": 0,
                "applications": 0,
                "jobsDiscovered": 0
            })
        heatmap_payload = {
            "searches": {},
            "applied": {},
            "failed": {},
            "interviews": {},
            "all": {},
            "totals": {"searches": 0, "applied": 0, "failed": 0, "interviews": 0, "all": 0},
            "activeDays": {"searches": 0, "applied": 0, "failed": 0, "interviews": 0, "all": 0},
            "maxStreaks": {"searches": 0, "applied": 0, "failed": 0, "interviews": 0, "all": 0}
        }
        return heatmap_payload, timeline_bars, 0, 0, 0

    cur = conn.cursor()
    
    # 1. Query user-specific jobs & applications by date, scoped to profile_id
    db_applied_by_date = {}
    db_jobs_by_date = {}
    try:
        bm_query = """
            SELECT date(jb.created_at / 1000, 'unixepoch') as dStr, 
                   COUNT(*) as cnt,
                   SUM(CASE WHEN j.applied = 1 THEN 1 ELSE 0 END) as appCnt
            FROM job_bookmarks jb
            JOIN jobs j ON jb.job_id = j.id
            WHERE jb.user_id = ? AND jb.created_at > 0
        """
        bm_params = [user_id]
        if profile_id:
            bm_query += " AND jb.profile_id = ?"
            bm_params.append(profile_id)
        bm_query += " GROUP BY dStr"
        bm_rows = cur.execute(bm_query, bm_params).fetchall()
        for r in bm_rows:
            if r["dStr"]:
                db_jobs_by_date[r["dStr"]] = db_jobs_by_date.get(r["dStr"], 0) + (r["cnt"] or 0)
                if r["appCnt"]:
                    db_applied_by_date[r["dStr"]] = db_applied_by_date.get(r["dStr"], 0) + r["appCnt"]
        
        job_query = """
            SELECT date(created_at / 1000, 'unixepoch') as dStr, 
                   COUNT(*) as cnt,
                   SUM(CASE WHEN applied = 1 THEN 1 ELSE 0 END) as appCnt
            FROM jobs
            WHERE user_id = ? AND user_id != 'default' AND created_at > 0
        """
        job_params = [user_id]
        if profile_id:
            job_query += " AND profile_id = ?"
            job_params.append(profile_id)
        job_query += " GROUP BY dStr"
        user_job_rows = cur.execute(job_query, job_params).fetchall()
        for r in user_job_rows:
            if r["dStr"]:
                db_jobs_by_date[r["dStr"]] = db_jobs_by_date.get(r["dStr"], 0) + (r["cnt"] or 0)
                if r["appCnt"]:
                    db_applied_by_date[r["dStr"]] = db_applied_by_date.get(r["dStr"], 0) + r["appCnt"]
    except Exception:
        pass

    # 2. Explorer runs (user-specific job searches / discoveries scoped to profile_id)
    db_searches_by_date = {}
    try:
        exp_query = """
            SELECT date(started_at / 1000, 'unixepoch') as dStr,
                   SUM(jobs_discovered) as discCnt
            FROM explorer_runs
            WHERE user_id = ? AND started_at > 0
        """
        exp_params = [user_id]
        if profile_id:
            exp_query += " AND profile_id = ?"
            exp_params.append(profile_id)
        exp_query += " GROUP BY dStr"
        exp_rows = cur.execute(exp_query, exp_params).fetchall()
        for r in exp_rows:
            if r["dStr"]:
                db_searches_by_date[r["dStr"]] = db_searches_by_date.get(r["dStr"], 0) + (r["discCnt"] or 0)
    except Exception:
        pass

    # 3. User-specific tailored resumes
    if profile_id:
        try:
            tr_rows = cur.execute("""
                SELECT date(created_at / 1000, 'unixepoch') as dStr,
                       COUNT(*) as cnt
                FROM tailored_resumes
                WHERE profile_id = ? AND created_at > 0
                GROUP BY dStr
            """, (profile_id,)).fetchall()
            for r in tr_rows:
                if r["dStr"]:
                    db_applied_by_date[r["dStr"]] = db_applied_by_date.get(r["dStr"], 0) + (r["cnt"] or 0)
        except Exception:
            pass

    # 4. User-specific activities scoped to profile_id
    db_interviews_by_date = {}
    db_failed_by_date = {}
    try:
        act_query = """
            SELECT date(created_at / 1000, 'unixepoch') as dStr,
                   text, status
            FROM activities
            WHERE user_id = ? AND created_at > 0
        """
        act_params = [user_id]
        if profile_id:
            act_query += " AND profile_id = ?"
            act_params.append(profile_id)
        act_rows = cur.execute(act_query, act_params).fetchall()
        for r in act_rows:
            d_str = r["dStr"]
            if not d_str:
                continue
            txt = (r["text"] or "").lower()
            if "interview" in txt:
                db_interviews_by_date[d_str] = db_interviews_by_date.get(d_str, 0) + 1
            elif "reject" in txt or "fail" in txt:
                db_failed_by_date[d_str] = db_failed_by_date.get(d_str, 0) + 1
            elif "search" in txt or "scan" in txt or "discover" in txt:
                db_searches_by_date[d_str] = db_searches_by_date.get(d_str, 0) + 1
            elif "applied" in txt or "submit" in txt:
                db_applied_by_date[d_str] = db_applied_by_date.get(d_str, 0) + 1
    except Exception:
        pass

    searches_map = {}
    applied_map = {}
    failed_map = {}
    interviews_map = {}
    all_map = {}

    total_searches = 0
    active_search_days = 0
    max_search_streak = 0
    curr_search_streak = 0

    total_applied = 0
    active_app_days = 0
    max_app_streak = 0
    curr_app_streak = 0

    total_failed = 0
    active_failed_days = 0
    max_failed_streak = 0
    curr_failed_streak = 0

    total_interviews = 0
    active_int_days = 0
    max_int_streak = 0
    curr_int_streak = 0

    # Iterate over 365 trailing days
    for days_back in range(364, -1, -1):
        target_dt = now - timedelta(days=days_back)
        d_str = target_dt.strftime("%Y-%m-%d")

        # 1. Searches / Discovered
        s_cnt = db_jobs_by_date.get(d_str, 0) + db_searches_by_date.get(d_str, 0)
        if s_cnt > 0:
            searches_map[d_str] = s_cnt
            total_searches += s_cnt
            active_search_days += 1
            curr_search_streak += 1
            if curr_search_streak > max_search_streak:
                max_search_streak = curr_search_streak
        else:
            curr_search_streak = 0

        # 2. Applied
        a_cnt = db_applied_by_date.get(d_str, 0)
        if a_cnt > 0:
            applied_map[d_str] = a_cnt
            total_applied += a_cnt
            active_app_days += 1
            curr_app_streak += 1
            if curr_app_streak > max_app_streak:
                max_app_streak = curr_app_streak
        else:
            curr_app_streak = 0

        # 3. Failed / Rejected
        f_cnt = db_failed_by_date.get(d_str, 0)
        if f_cnt > 0:
            failed_map[d_str] = f_cnt
            total_failed += f_cnt
            active_failed_days += 1
            curr_failed_streak += 1
            if curr_failed_streak > max_failed_streak:
                max_failed_streak = curr_failed_streak
        else:
            curr_failed_streak = 0

        # 4. Interviews
        i_cnt = db_interviews_by_date.get(d_str, 0)
        if i_cnt > 0:
            interviews_map[d_str] = i_cnt
            total_interviews += i_cnt
            active_int_days += 1
            curr_int_streak += 1
            if curr_int_streak > max_int_streak:
                max_int_streak = curr_int_streak
        else:
            curr_int_streak = 0

        # 5. Combined Activity
        day_all = s_cnt + a_cnt + f_cnt + i_cnt
        if day_all > 0:
            all_map[d_str] = day_all

    total_all = total_searches + total_applied + total_failed + total_interviews
    active_all_days = len(all_map)

    # Compute max streak for all activity
    curr_all_s = 0
    max_all_streak = 0
    for days_back in range(364, -1, -1):
        target_dt = now - timedelta(days=days_back)
        d_str = target_dt.strftime("%Y-%m-%d")
        if d_str in all_map:
            curr_all_s += 1
            if curr_all_s > max_all_streak:
                max_all_streak = curr_all_s
        else:
            curr_all_s = 0

    # Build 7-day velocity timeline dynamically
    timeline_bars = []
    for i in range(6, -1, -1):
        d = now - timedelta(days=i)
        d_str = d.strftime("%Y-%m-%d")
        d_label = d.strftime("%b %d")
        day_apps = applied_map.get(d_str, 0)
        day_searches = searches_map.get(d_str, 0)
        timeline_bars.append({
            "day": d_label,
            "date": d_str,
            "formattedDate": d_str,
            "count": day_apps,
            "applications": day_apps,
            "jobsDiscovered": day_searches
        })

    heatmap_payload = {
        "searches": searches_map,
        "applied": applied_map,
        "failed": failed_map,
        "interviews": interviews_map,
        "all": all_map,
        "totals": {
            "searches": total_searches,
            "applied": total_applied,
            "failed": total_failed,
            "interviews": total_interviews,
            "all": total_all
        },
        "activeDays": {
            "searches": active_search_days,
            "applied": active_app_days,
            "failed": active_failed_days,
            "interviews": active_int_days,
            "all": active_all_days
        },
        "maxStreaks": {
            "searches": max_search_streak,
            "applied": max_app_streak,
            "failed": max_failed_streak,
            "interviews": max_int_streak,
            "all": max_all_streak
        }
    }

    return heatmap_payload, timeline_bars, total_applied, total_interviews, total_searches

@router.get("/analytics")
@router.get("/analytics/overview")
def get_analytics(
    profile_id: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    user_id = current_user.get("id") if current_user else None

    with get_db() as conn:
        cur = conn.cursor()

        # Resolve candidate profile for this user
        resolved_pid = profile_id
        if resolved_pid and user_id:
            p_row = cur.execute(
                "SELECT id FROM candidate_profiles WHERE id = ? AND user_id = ?",
                (resolved_pid, user_id)
            ).fetchone()
            if not p_row:
                other_u = cur.execute("SELECT user_id FROM candidate_profiles WHERE id = ?", (resolved_pid,)).fetchone()
                if other_u and other_u["user_id"] != user_id:
                    raise HTTPException(status_code=403, detail="Forbidden: You cannot access another user's candidate profile analytics.")
                resolved_pid = None

        if not resolved_pid and user_id:
            p_row = cur.execute(
                "SELECT id FROM candidate_profiles WHERE user_id = ? AND is_active = 1",
                (user_id,)
            ).fetchone()
            if not p_row:
                p_row = cur.execute(
                    "SELECT id FROM candidate_profiles WHERE user_id = ? ORDER BY created_at ASC LIMIT 1",
                    (user_id,)
                ).fetchone()
            resolved_pid = p_row["id"] if p_row else None

        heatmap_data, timeline_bars, total_apps, interviews_count, total_searches = generate_dynamic_heatmap_and_metrics(conn, user_id, resolved_pid)

        # 1. Fetch user tailored resumes
        tailored_resumes = []
        if resolved_pid:
            tailored_resumes = cur.execute("""
                SELECT tr.id, tr.job_id, tr.ats_score, tr.target_role, tr.target_company, tr.created_at,
                       j.source
                FROM tailored_resumes tr
                LEFT JOIN jobs j ON tr.job_id = j.id
                WHERE tr.profile_id = ?
            """, (resolved_pid,)).fetchall()

        # 2. Fetch user bookmarked/applied jobs scoped to resolved_pid
        user_jobs = []
        if user_id:
            if resolved_pid:
                user_jobs = cur.execute("""
                    SELECT j.id, j.role, j.company, j.source, j.atsScore, j.applied
                    FROM jobs j
                    JOIN job_bookmarks jb ON j.id = jb.job_id
                    WHERE jb.user_id = ? AND jb.profile_id = ?
                    UNION
                    SELECT j.id, j.role, j.company, j.source, j.atsScore, j.applied
                    FROM jobs j
                    WHERE j.user_id = ? AND j.profile_id = ?
                """, (user_id, resolved_pid, user_id, resolved_pid)).fetchall()
            else:
                user_jobs = cur.execute("""
                    SELECT j.id, j.role, j.company, j.source, j.atsScore, j.applied
                    FROM jobs j
                    JOIN job_bookmarks jb ON j.id = jb.job_id
                    WHERE jb.user_id = ?
                    UNION
                    SELECT j.id, j.role, j.company, j.source, j.atsScore, j.applied
                    FROM jobs j
                    WHERE j.user_id = ?
                """, (user_id, user_id)).fetchall()

        user_jobs_count = len(user_jobs)
        tailored_count = len(tailored_resumes)

        # Truthful multi-tenant metrics: When user has 0 records, return clean zeros!
        if user_jobs_count == 0 and tailored_count == 0:
            total_db_jobs = 0
            company_cnt = 0
            avg_ats_str = "0%"
            platform_metrics = []
            top_roles = []
            ats_brackets = {
                "bracket90": 0,
                "bracket80": 0,
                "bracket70": 0,
                "bracketBelow70": 0
            }
        else:
            # Calculate ATS score metrics from user's real tailored resumes or tracked jobs
            ats_scores = []
            companies_set = set()
            role_counts = {}
            platform_counts = {}

            if tailored_count > 0:
                for tr in tailored_resumes:
                    score = tr["ats_score"] or 0
                    ats_scores.append(score)
                    if tr["target_company"]:
                        companies_set.add(tr["target_company"])
                    r = tr["target_role"] or "Software Engineer"
                    role_counts[r] = role_counts.get(r, 0) + 1
                    src = tr["source"] or "Platform"
                    platform_counts[src] = platform_counts.get(src, 0) + 1
            else:
                for j in user_jobs:
                    score = j["atsScore"] or 0
                    ats_scores.append(score)
                    if j["company"]:
                        companies_set.add(j["company"])
                    r = j["role"] or "Software Engineer"
                    role_counts[r] = role_counts.get(r, 0) + 1
                    src = j["source"] or "Platform"
                    platform_counts[src] = platform_counts.get(src, 0) + 1

            total_db_jobs = user_jobs_count + tailored_count
            company_cnt = len(companies_set)
            avg_val = (sum(ats_scores) / len(ats_scores)) if ats_scores else 0
            avg_ats_str = f"{round(avg_val)}%"

            b90 = sum(1 for s in ats_scores if s >= 90)
            b80 = sum(1 for s in ats_scores if 80 <= s < 90)
            b70 = sum(1 for s in ats_scores if 70 <= s < 80)
            bBelow = sum(1 for s in ats_scores if s < 70)

            ats_brackets = {
                "bracket90": b90,
                "bracket80": b80,
                "bracket70": b70,
                "bracketBelow70": bBelow
            }

            platform_metrics = []
            for p_name, p_cnt in sorted(platform_counts.items(), key=lambda x: x[1], reverse=True):
                platform_metrics.append({
                    "name": p_name,
                    "applications": p_cnt,
                    "interviews": 0,
                    "successRate": f"{round((interviews_count / max(1, p_cnt)) * 100, 1)}%" if p_cnt > 0 else "0.0%"
                })

            top_roles = []
            for r_name, r_cnt in sorted(role_counts.items(), key=lambda x: x[1], reverse=True)[:5]:
                top_roles.append({
                    "role": r_name,
                    "applications": r_cnt,
                    "interviews": 0
                })

    offers_count = 0
    actual_apps = max(total_apps, tailored_count)
    response_rate = f"{round((interviews_count / actual_apps) * 100, 1)}%" if actual_apps > 0 else "0%"

    return {
        "totalJobsInDb": total_db_jobs,
        "totalApplications": actual_apps,
        "interviews": interviews_count,
        "offers": offers_count,
        "responseRate": response_rate,
        "interviewRate": response_rate,
        "averageAtsScore": avg_ats_str,
        "activeCompanies": company_cnt,
        "timelineData": timeline_bars,
        "dailyBreakdown": timeline_bars,
        "heatmap": heatmap_data,
        "funnel": {
            "jobsFound": max(total_db_jobs, total_searches),
            "tailoredResumes": tailored_count,
            "applications": actual_apps,
            "interviews": interviews_count,
            "offers": offers_count
        },
        "statusDistribution": {
            "applied": actual_apps,
            "inProgress": 0,
            "interview": interviews_count,
            "rejected": heatmap_data["totals"]["failed"],
            "offer": offers_count
        },
        "platformMetrics": platform_metrics,
        "topRoles": top_roles,
        "atsBrackets": ats_brackets
    }
