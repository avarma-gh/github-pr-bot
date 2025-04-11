// Compare dependency changes between two package.json files
function compareDependencies(before = {}, after = {}) {
  const changes = [];
  const allPackages = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const pkg of allPackages) {
    const beforeVer = before[pkg];
    const afterVer = after[pkg];

    if (!beforeVer && afterVer) {
      changes.push(`Added: ${pkg}@${afterVer}`);
    } else if (beforeVer && !afterVer) {
      changes.push(`Removed: ${pkg}@${beforeVer}`);
    } else if (beforeVer !== afterVer) {
      changes.push(`Changed: ${pkg} from ${beforeVer} → ${afterVer}`);
    }
  }

  return changes;
}

module.exports = {
  compareDependencies,
};
