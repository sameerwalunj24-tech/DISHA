import glob
import re
import yaml

files = glob.glob('data/pathways/*.yaml')
print(f"Checking {len(files)} files...")

for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        lines = f.read().splitlines()

    new_lines = []
    for line in lines:
        m = re.match(r'^(\s*(?:mr|hi|en|title|description|practical_action):\s*)(.*)$', line)
        if m:
            prefix, val = m.group(1), m.group(2).strip()
            if val and not (val.startswith('"') and val.endswith('"')) and not (val.startswith("'") and val.endswith("'")):
                # Wrap in quotes
                val_escaped = val.replace('\\', '\\\\').replace('"', '\\"')
                line = f'{prefix}"{val_escaped}"'
        new_lines.append(line)

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(new_lines) + '\n')

    # Test load
    with open(fpath, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)
    print(f"OK: {fpath} -> cluster: {data.get('career_cluster')}")

print("All pathway templates validated successfully!")
