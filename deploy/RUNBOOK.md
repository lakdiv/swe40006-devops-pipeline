# Runbook: rebuild the FixLog server

Use this if the EC2 host is lost or broken. Everything the server needs is in this repository. Database contents are not backed up and start empty.

## 1. Launch the instance

AWS console, region **Asia Pacific (Sydney)**:

- Amazon Linux 2023, 64-bit (x86), `t3.small`, 20 GiB gp3
- Security group inbound rules:

| Port | Source | Purpose |
|---|---|---|
| 22 | Anywhere | SSH for the team and GitHub Actions |
| 80 | Anywhere | Production |
| 8082 | Anywhere | Staging, reached by the Playwright tests |
| 8081 | Team IPs | Test |
| 9090 | Team IPs | Prometheus |
| 3000 | Team IPs | Grafana |

- Associate the Elastic IP with the new instance. If the IP changes, update the `EC2_HOST` repository variable in GitHub.

## 2. Provision

```bash
scp deploy/provision.sh ec2-user@<ip>:
ssh ec2-user@<ip> 'sudo bash provision.sh'
```

Add the GitHub Actions public key to `/home/deploy/.ssh/authorized_keys`. The matching private key is the `EC2_SSH_KEY` secret.

## 3. Copy the repository and deploy

```bash
rsync -a --delete --exclude .git --exclude node_modules ./ deploy@<ip>:fixlog/
ssh deploy@<ip> 'for e in test staging prod; do bash fixlog/deploy/deploy.sh $e; done'
ssh deploy@<ip> 'bash fixlog/monitoring/start.sh'
```

`deploy.sh` creates new database passwords in `~/env/` on the first run. `start.sh` prints the new Grafana password.

## 4. Check

- `http://<ip>/health`, `http://<ip>:8082/health` and `http://<ip>:8081/health` return `"database":"connected"`
- Prometheus targets at `http://<ip>:9090/targets` are all UP
- Run the Deploy workflow once from the Actions tab to confirm the pipeline reaches the server
