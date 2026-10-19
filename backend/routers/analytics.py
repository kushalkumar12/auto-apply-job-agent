from fastapi import APIRouter
from datetime import datetime, timedelta
import math

try:
    from ..database import get_db
except (ImportError, ValueError):
    from database import get_db

router = APIRouter(tags=["Analytics"])

def generate_dynamic_heatmap_and_metrics(conn):
    """
    Computes 365-day activity ledger and metrics directly from SQLite database records.
    When brand new, returns 0s and empty maps without any artificial or mock data.
    """
    cur = conn.cursor()
    
    # 1. Query real jobs by date
    db_applied_by_date = {}
    db_jobs_by_date = {}
    try:
        job_rows = cur.execute("""
            SELECT date(created_at / 1000, 'unixepoch') as dStr, 
                   COUNT(*) as cnt,
                   SUM(CASE WHEN applied = 1 THEN 1 ELSE 0 END) as appCnt
            FROM jobs
            WHERE created_at > 0
            GROUP BY dStr
        """).fetchall()
        for r in job_rows:
            if r["dStr"]:
                db_jobs_by_date[r["dStr"]] = r["cnt"] or 0
                if r["appCnt"]:
                    db_applied_by_date[r["dStr"]] = r["appCnt"]
    except Exception:
        pass

    # 2. Query real activities by date
    db_interviews_by_date = {}
    db_failed_by_date = {}
    db_searches_by_date = {}
    try:
        act_rows = cur.execute("""
            SELECT date(created_at / 1000, 'unixepoch') as dStr,
                   text, status
            FROM activities
            WHERE created_at > 0
        """).fetchall()
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
    except Exception:
        pass

    now = datetime.now()
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
def get_analytics():
    with get_db() as conn:
        heatmap_data, timeline_bars, total_apps, interviews_count, total_searches = generate_dynamic_heatmap_and_metrics(conn)
        cur = conn.cursor()

        stats_row = cur.execute("""
            SELECT 
                COUNT(*) as total_jobs,
                COUNT(DISTINCT company) as distinct_companies,
                AVG(atsScore) as avg_ats,
                SUM(CASE WHEN applied = 1 THEN 1 ELSE 0 END) as applied_jobs,
                SUM(CASE WHEN atsScore >= 90 THEN 1 ELSE 0 END) as b90,
                SUM(CASE WHEN atsScore >= 80 AND atsScore < 90 THEN 1 ELSE 0 END) as b80,
                SUM(CASE WHEN atsScore >= 70 AND atsScore < 80 THEN 1 ELSE 0 END) as b70,
                SUM(CASE WHEN atsScore < 70 THEN 1 ELSE 0 END) as bBelow70
            FROM jobs
        """).fetchone()

        total_db_jobs = stats_row["total_jobs"] or 0
        company_cnt = stats_row["distinct_companies"] or 0
        avg_ats = stats_row["avg_ats"]

        # Real platform metrics from actual jobs
        platform_rows = cur.execute("""
            SELECT source as name,
                   COUNT(*) as jobsCount,
                   SUM(CASE WHEN applied = 1 THEN 1 ELSE 0 END) as applications
            FROM jobs
            GROUP BY source
            ORDER BY jobsCount DESC
        """).fetchall()

        platform_metrics = []
        for pr in platform_rows:
            p_apps = pr["applications"] or 0
            succ_rate = f"{round((interviews_count / max(1, p_apps)) * 100, 1)}%" if p_apps > 0 else "0.0%"
            platform_metrics.append({
                "name": pr["name"],
                "applications": p_apps,
                "interviews": 0,
                "successRate": succ_rate
            })

        # Real top roles from actual jobs
        role_rows = cur.execute("""
            SELECT role,
                   COUNT(*) as jobsCount,
                   SUM(CASE WHEN applied = 1 THEN 1 ELSE 0 END) as applications
            FROM jobs
            GROUP BY role
            ORDER BY jobsCount DESC
            LIMIT 5
        """).fetchall()

        top_roles = []
        for rr in role_rows:
            top_roles.append({
                "role": rr["role"],
                "applications": rr["applications"] or 0,
                "interviews": 0
            })

    offers_count = 0
    response_rate = f"{round((interviews_count / total_apps) * 100, 1)}%" if total_apps > 0 else "0.0%"
    avg_ats_str = f"{round(avg_ats)}%" if (avg_ats is not None and total_db_jobs > 0) else "0%"

    return {
        "totalJobsInDb": total_db_jobs,
        "totalApplications": total_apps,
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
            "jobsFound": total_db_jobs,
            "tailoredResumes": total_apps,
            "applications": total_apps,
            "interviews": interviews_count,
            "offers": offers_count
        },
        "statusDistribution": {
            "applied": total_apps,
            "inProgress": 0,
            "interview": interviews_count,
            "rejected": heatmap_data["totals"]["failed"],
            "offer": offers_count
        },
        "platformMetrics": platform_metrics,
        "topRoles": top_roles,
        "atsBrackets": {
            "bracket90": stats_row["b90"] or 0,
            "bracket80": stats_row["b80"] or 0,
            "bracket70": stats_row["b70"] or 0,
            "bracketBelow70": stats_row["bBelow70"] or 0
        }
    }
