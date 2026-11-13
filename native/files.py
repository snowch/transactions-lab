"""Real Linux file replacement; process interruption is NOT power-loss testing."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile


def replace(target, protocol='durable', crash=None):
    target = Path(target)
    temporary = target.with_name(target.name + '.tmp')

    def boundary(name):
        if crash == name:
            os._exit(73)

    with open(temporary, 'wb') as stream:
        stream.write(b'new configuration\n')
        stream.flush()
        boundary('after-write')
        if protocol == 'durable':
            os.fsync(stream.fileno())
            boundary('after-file-sync')
    os.replace(temporary, target)
    boundary('after-rename')
    if protocol == 'durable':
        directory = os.open(target.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
        boundary('after-dir-sync')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--protocol', choices=['durable', 'rename-only'], default='durable')
    parser.add_argument('--crash', choices=['after-write', 'after-file-sync', 'after-rename', 'after-dir-sync'])
    parser.add_argument('--child', type=Path)
    args = parser.parse_args()
    if args.child:
        replace(args.child, args.protocol, args.crash)
        return
    with tempfile.TemporaryDirectory(prefix='transactions-files-') as folder:
        target = Path(folder) / 'config.txt'
        target.write_text('old configuration\n')
        command = [sys.executable, __file__, '--child', str(target), '--protocol', args.protocol]
        if args.crash:
            command += ['--crash', args.crash]
        child = subprocess.run(command, check=False)
        if child.returncode not in (0, 73):
            raise RuntimeError(f'child failed: {child.returncode}')
        recovered = subprocess.check_output([sys.executable, '-c', 'from pathlib import Path; import sys; print(Path(sys.argv[1]).read_text(),end="")', str(target)], text=True)
        print(json.dumps({'protocol': args.protocol, 'requested_crash': args.crash,
                          'injected_exit': child.returncode == 73,
                          'acknowledged': child.returncode == 0,
                          'observed': recovered.strip(),
                          'boundary': 'Process exit only; OS caches remain. This does not establish power-loss durability.'}, indent=2))


if __name__ == '__main__':
    main()
