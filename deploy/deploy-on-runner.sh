#!/usr/bin/env bash

set -euo pipefail

die() {
  echo "deployment error: $*" >&2
  exit 1
}

xml_escape() {
  printf '%s' "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' -e 's/"/\&quot;/g' -e "s/'/\&apos;/g"
}

sed_escape() {
  printf '%s' "$1" | sed -e 's/[&|\\]/\\&/g'
}

template_value() {
  sed_escape "$(xml_escape "$1")"
}

restart_service() {
  launchctl bootout "$launchd_domain/$launchd_label" >/dev/null 2>&1 || true
  launchctl bootstrap "$launchd_domain" "$plist_path" || return 1
  launchctl enable "$launchd_domain/$launchd_label" || return 1
  launchctl kickstart -k "$launchd_domain/$launchd_label" || return 1
}

switch_to_release() {
  local target_release="$1"
  ln -s "$target_release" "$next_link"
  "$python_bin" - "$next_link" "$current_link" <<'PY'
import os
import sys

os.replace(sys.argv[1], sys.argv[2])
PY
}

health_check() {
  curl --fail --retry 5 --retry-connrefused --retry-delay 1 --silent --show-error "http://127.0.0.1:${service_port}/" >/dev/null
}

deploy_release() {
  switch_to_release "$new_release" || return 1
  restart_service || return 1
  health_check || return 1
}

restore_previous_release() {
  if [[ -z "$previous_release" ]]; then
    echo 'No earlier release is available to restore.' >&2
    return 0
  fi

  echo "Restoring $previous_release"
  switch_to_release "$previous_release" || return 1
  restart_service || return 1
  health_check || return 1
}

source_directory="${1:-${GITHUB_WORKSPACE:-}/dist}"
deploy_root="${DEPLOY_ROOT:-$HOME/toolkitly}"
release_name="${RELEASE_NAME:-manual-$(date +%Y%m%d%H%M%S)}"
service_port="${SERVICE_PORT:-34561}"
service_host="${SERVICE_HOST:-0.0.0.0}"
launchd_label="${LAUNCHD_LABEL:-com.bongworks.toolkitly}"
launchd_domain="${LAUNCHD_DOMAIN:-gui/$(id -u)}"
python_bin="${PYTHON_BIN:-$(command -v python3 || true)}"
script_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
template_path="$script_directory/com.bongworks.toolkitly.plist.template"

[[ -d "$source_directory" && -f "$source_directory/index.html" ]] || die "static build output is missing: $source_directory"
[[ "$deploy_root" = /* ]] || die 'DEPLOY_ROOT must be an absolute path'
[[ "$release_name" =~ ^[A-Za-z0-9._-]+$ ]] || die "unsafe release name: $release_name"
[[ "$service_port" =~ ^[1-9][0-9]{0,4}$ ]] && (( service_port <= 65535 )) || die "invalid service port: $service_port"
[[ "$service_host" =~ ^[A-Za-z0-9.:-]+$ ]] || die "invalid service host: $service_host"
[[ "$launchd_label" =~ ^[A-Za-z0-9.-]+$ ]] || die "invalid launchd label: $launchd_label"
[[ "$launchd_domain" =~ ^(gui|user)/[0-9]+$ ]] || die "invalid launchd domain: $launchd_domain"
[[ -x "$python_bin" ]] || die 'python3 is required on the self-hosted runner'
[[ -f "$template_path" ]] || die "launchd template is missing: $template_path"

releases_directory="$deploy_root/releases"
logs_directory="$deploy_root/logs"
current_link="$deploy_root/current"
next_link="$deploy_root/.current-next-$release_name"
new_release="$releases_directory/$release_name"
agent_directory="${LAUNCHD_AGENT_DIRECTORY:-$HOME/Library/LaunchAgents}"
plist_path="$agent_directory/$launchd_label.plist"
temporary_plist="$plist_path.new"
previous_release=''

mkdir -p "$releases_directory" "$logs_directory" "$agent_directory"
[[ ! -e "$new_release" ]] || die "release directory already exists: $new_release"
/usr/bin/ditto "$source_directory" "$new_release"
[[ -f "$new_release/index.html" ]] || die "release has no index.html: $new_release"

if [[ -L "$current_link" ]]; then
  previous_release="$(readlink "$current_link")"
  [[ -d "$previous_release" ]] || die "current release target is unavailable: $previous_release"
fi

sed \
  -e "s|__LAUNCHD_LABEL__|$(template_value "$launchd_label")|g" \
  -e "s|__PYTHON_BIN__|$(template_value "$python_bin")|g" \
  -e "s|__SERVICE_PORT__|$service_port|g" \
  -e "s|__SERVICE_HOST__|$(template_value "$service_host")|g" \
  -e "s|__CURRENT_RELEASE__|$(template_value "$current_link")|g" \
  -e "s|__LOG_DIR__|$(template_value "$logs_directory")|g" \
  "$template_path" > "$temporary_plist"
plutil -lint "$temporary_plist" >/dev/null
mv -f "$temporary_plist" "$plist_path"

if ! deploy_release; then
  echo "Release health check failed or launchd restart failed: $new_release" >&2
  restore_previous_release || echo 'Previous release could not be restored cleanly.' >&2
  exit 1
fi

echo "Deployed $release_name at http://$service_host:$service_port/"
