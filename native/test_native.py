import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from journal import persist, replay

ROOT = Path(__file__).parent


class NativeTests(unittest.TestCase):
    def test_file_protocol_at_each_process_boundary(self):
        for protocol in ['durable', 'rename-only']:
            for point in [None, 'after-write', 'after-file-sync', 'after-rename', 'after-dir-sync']:
                with self.subTest(protocol=protocol, point=point):
                    command = [sys.executable, str(ROOT / 'files.py'), '--protocol', protocol]
                    if point:
                        command += ['--crash', point]
                    result = json.loads(subprocess.check_output(command, text=True))
                    self.assertIn(result['observed'], ['old configuration', 'new configuration'])
                    reached = point is not None and (protocol == 'durable' or point in ['after-write', 'after-rename'])
                    self.assertEqual(result['injected_exit'], reached)
                    self.assertEqual(result['acknowledged'], not reached)
                    if point in ['after-write', 'after-file-sync'] and reached:
                        self.assertEqual(result['observed'], 'old configuration')
                    else:
                        self.assertEqual(result['observed'], 'new configuration')

    def test_repeated_recovery_exposes_increment_and_preserves_after_image(self):
        for representation, expected in [('increment', [120, 140, 160]), ('after-image', [120, 120, 120])]:
            with self.subTest(representation=representation), tempfile.TemporaryDirectory() as folder:
                root = Path(folder)
                persist(root / 'balance.json', 100)
                persist(root / 'committed.json', {'amount': 20, 'after_image': 120})
                self.assertEqual([replay(root, representation) for _ in range(3)], expected)

    def test_published_journal_command(self):
        for representation, expected in [('increment', False), ('after-image', True)]:
            result = json.loads(subprocess.check_output([sys.executable, str(ROOT / 'journal.py'), '--representation', representation], text=True))
            self.assertEqual(result['effect_applied_once'], expected)
