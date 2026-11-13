"""Persistent replay experiment: startup can fail before clearing committed work."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile


def persist(path, value):
    temporary = path.with_suffix('.tmp')
    with open(temporary, 'w') as stream:
        json.dump(value, stream)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temporary, path)
    directory = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(directory)
    finally:
        os.close(directory)


def replay(folder, representation):
    folder = Path(folder)
    record = json.loads((folder / 'committed.json').read_text())
    current = json.loads((folder / 'balance.json').read_text())
    value = current + record['amount'] if representation == 'increment' else record['after_image']
    persist(folder / 'balance.json', value)
    # Deliberately stop before clearing the committed record; the next startup sees it.
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--representation', choices=['increment', 'after-image'], default='after-image')
    parser.add_argument('--child', type=Path)
    args = parser.parse_args()
    if args.child:
        print(replay(args.child, args.representation))
        return
    with tempfile.TemporaryDirectory(prefix='transactions-journal-') as folder:
        root = Path(folder)
        persist(root / 'balance.json', 100)
        persist(root / 'committed.json', {'id': 'deposit-1', 'amount': 20, 'after_image': 120})
        observations = []
        for _ in range(2):
            observations.append(int(subprocess.check_output([sys.executable, __file__, '--child', folder, '--representation', args.representation], text=True)))
        print(json.dumps({'representation': args.representation, 'startup_balances': observations,
                          'expected': 120, 'effect_applied_once': observations[-1] == 120,
                          'boundary': 'Two real process startups; committed work deliberately survives both. No power loss or torn writes.'}, indent=2))


if __name__ == '__main__':
    main()
