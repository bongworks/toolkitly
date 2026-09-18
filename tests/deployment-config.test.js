import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('deployment runner script is executable after checkout', async () => {
  const scriptPath = new URL('../deploy/deploy-on-runner.sh', import.meta.url);
  const scriptStats = await stat(scriptPath);

  assert.notEqual(scriptStats.mode & 0o111, 0);
});

test('deployment workflow builds the static release from GitHub Variables on port 34561', async () => {
  const workflow = await readProjectFile('.github/workflows/deploy.yml');

  assert.match(workflow, /tags:\n\s+- 'release-\*'/);
  assert.match(workflow, /runs-on: \[self-hosted, bongbong-MacBookPro-M2\]/);
  assert.match(workflow, /PUBLIC_SITE_URL: \$\{\{ vars\.PUBLIC_SITE_URL \}\}/);
  assert.match(workflow, /GA4_MEASUREMENT_ID: \$\{\{ vars\.GA4_MEASUREMENT_ID \}\}/);
  assert.match(workflow, /ADSENSE_CLIENT_ID: \$\{\{ vars\.ADSENSE_CLIENT_ID \}\}/);
  assert.match(workflow, /GOOGLE_CONSENT_REQUIRED: \$\{\{ vars\.GOOGLE_CONSENT_REQUIRED \}\}/);
  assert.match(workflow, /DEPLOY_ROOT: \$\{\{ vars\.TOOLKITLY_DEPLOY_ROOT \}\}/);
  assert.match(workflow, /SERVICE_PORT: '34561'/);
  assert.match(workflow, /printf 'PUBLIC_SITE_URL=%s\\n' "\$PUBLIC_SITE_URL"/);
  assert.doesNotMatch(workflow, /TOOLKITLY_DEPLOY_ROOT GitHub Variable is required/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /deploy\/deploy-on-runner\.sh "\$GITHUB_WORKSPACE\/dist"/);
});

test('deployment script atomically switches releases and restores the previous one when port 34561 is unhealthy', async () => {
  const [script, template] = await Promise.all([
    readProjectFile('deploy/deploy-on-runner.sh'),
    readProjectFile('deploy/com.bongworks.toolkitly.plist.template'),
  ]);

  assert.match(script, /service_port="\$\{SERVICE_PORT:-34561\}"/);
  assert.match(script, /deploy_root="\$\{DEPLOY_ROOT:-\$HOME\/toolkitly\}"/);
  assert.doesNotMatch(script, /\[\[ -n "\$deploy_root"/);
  assert.match(script, /launchd_label="\$\{LAUNCHD_LABEL:-com\.bongworks\.toolkitly\}"/);
  assert.match(script, /os\.replace\(sys\.argv\[1\], sys\.argv\[2\]\)/);
  assert.match(script, /http:\/\/127\.0\.0\.1:\$\{service_port\}\//);
  assert.match(script, /launchctl bootstrap "\$launchd_domain" "\$plist_path" \|\| return 1/);
  assert.match(script, /switch_to_release "\$new_release" \|\| return 1/);
  assert.match(script, /restart_service \|\| return 1/);
  assert.match(script, /health_check \|\| return 1/);
  assert.match(script, /restore_previous_release/);
  assert.match(script, /if ! deploy_release; then[\s\S]*restore_previous_release/);
  assert.match(script, /Release health check failed/);
  assert.match(template, /<string>__SERVICE_PORT__<\/string>/);
  assert.match(template, /<string>__CURRENT_RELEASE__<\/string>/);
});
