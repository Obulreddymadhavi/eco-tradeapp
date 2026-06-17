import json
import urllib.request
import urllib.error

def fetch_github_logs():
    repo = "Obulreddymadhavi/eco-tradeapp"
    headers = {"User-Agent": "Mozilla/5.0"}
    
    # 1. Fetch latest workflow runs
    url = f"https://api.github.com/repos/{repo}/actions/runs?per_page=1"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
    except urllib.error.URLError as e:
        print("Failed to fetch runs:", e)
        return
        
    runs = data.get("workflow_runs", [])
    if not runs:
        print("No runs found.")
        return
        
    run = runs[0]
    run_id = run["id"]
    commit_msg = run["head_commit"]["message"]
    print(f"Latest Run: ID={run_id}, Status={run['status']}, Conclusion={run['conclusion']}")
    print(f"Head Commit: {commit_msg}")
    
    # 2. Fetch jobs for the latest run
    jobs_url = f"https://api.github.com/repos/{repo}/actions/runs/{run_id}/jobs"
    req_jobs = urllib.request.Request(jobs_url, headers=headers)
    try:
        with urllib.request.urlopen(req_jobs) as response:
            jobs_data = json.loads(response.read().decode())
    except urllib.error.URLError as e:
        print("Failed to fetch jobs:", e)
        return
        
    jobs = jobs_data.get("jobs", [])
    for job in jobs:
        print(f"\nJob: {job['name']}, Conclusion: {job['conclusion']}")
        print("Steps:")
        for step in job["steps"]:
            print(f" - {step['name']}: {step['conclusion']} (Status: {step['status']})")

if __name__ == "__main__":
    fetch_github_logs()
