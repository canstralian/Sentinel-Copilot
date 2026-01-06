"""
Tests to ensure refactored code maintains the same behavior as the original.
"""

import unittest
import time
import os
from sentinel_monitor import SystemMonitor as OriginalMonitor
from sentinel_monitor_refactored import (
    SystemMonitor as RefactoredMonitor,
    Severity,
    MetricsValidator,
    SeverityCalculator,
    AlertThrottler,
    AlertFormatter,
    StatisticsAggregator
)


class TestMetricsValidator(unittest.TestCase):
    """Test the metrics validation component"""

    def test_valid_metrics(self):
        """Valid metrics should return no errors"""
        metrics = {
            'cpu': 50,
            'memory': 60,
            'disk': 70,
            'network': 40,
            'timestamp': time.time()
        }
        errors = MetricsValidator.validate(metrics)
        self.assertEqual([], errors)

    def test_invalid_format(self):
        """Invalid format should return error"""
        errors = MetricsValidator.validate(None)
        self.assertIn('Invalid metrics format', errors)

        errors = MetricsValidator.validate("not a dict")
        self.assertIn('Invalid metrics format', errors)

    def test_missing_keys(self):
        """Missing required keys should return errors"""
        metrics = {'cpu': 50}
        errors = MetricsValidator.validate(metrics)
        self.assertTrue(len(errors) > 0)
        self.assertTrue(any('Missing required key' in e for e in errors))


class TestSeverityCalculator(unittest.TestCase):
    """Test severity calculation logic"""

    def test_severity_levels(self):
        """Test different severity levels based on threshold exceedance"""
        threshold = 80

        # Low severity (just over threshold)
        severity = SeverityCalculator.calculate(81, threshold)
        self.assertEqual(Severity.MEDIUM, severity)

        # High severity (1.2x threshold)
        severity = SeverityCalculator.calculate(97, threshold)
        self.assertEqual(Severity.HIGH, severity)

        # Critical severity (1.5x threshold)
        severity = SeverityCalculator.calculate(125, threshold)
        self.assertEqual(Severity.CRITICAL, severity)

    def test_custom_severity(self):
        """Custom severity should override calculation"""
        severity = SeverityCalculator.calculate(150, 80, 'low')
        self.assertEqual(Severity.LOW, severity)


class TestAlertThrottler(unittest.TestCase):
    """Test alert throttling logic"""

    def test_first_alert_allowed(self):
        """First alert for a metric should always be allowed"""
        throttler = AlertThrottler(throttle_minutes=15)
        self.assertTrue(throttler.should_send_alert('cpu'))

    def test_throttling_blocks_duplicate(self):
        """Duplicate alert within throttle window should be blocked"""
        throttler = AlertThrottler(throttle_minutes=15)

        # First alert
        self.assertTrue(throttler.should_send_alert('cpu'))
        throttler.record_alert('cpu', Severity.HIGH, 90)

        # Second alert immediately after
        self.assertFalse(throttler.should_send_alert('cpu'))

    def test_different_metrics_not_throttled(self):
        """Alerts for different metrics should not throttle each other"""
        throttler = AlertThrottler(throttle_minutes=15)

        throttler.record_alert('cpu', Severity.HIGH, 90)
        self.assertTrue(throttler.should_send_alert('memory'))


class TestAlertFormatter(unittest.TestCase):
    """Test alert message formatting"""

    def test_message_format(self):
        """Alert message should contain all required information"""
        timestamp = time.time()
        message = AlertFormatter.format_message(
            'cpu', 85.5, 80, Severity.HIGH, timestamp
        )

        self.assertIn('HIGH', message)
        self.assertIn('CPU', message)
        self.assertIn('85.5', message)
        self.assertIn('80', message)

    def test_create_alert(self):
        """create_alert should return properly formatted Alert object"""
        timestamp = time.time()
        alert = AlertFormatter.create_alert('cpu', 85, 80, Severity.HIGH, timestamp)

        self.assertEqual('cpu', alert.metric_type)
        self.assertEqual(85, alert.value)
        self.assertEqual(80, alert.threshold)
        self.assertEqual(Severity.HIGH, alert.severity)
        self.assertIn('HIGH', alert.message)


class TestStatisticsAggregator(unittest.TestCase):
    """Test statistics aggregation"""

    def test_empty_alerts(self):
        """Empty alert list should return empty stats"""
        stats = StatisticsAggregator.aggregate([], 15)
        self.assertEqual({}, stats)

    def test_aggregation(self):
        """Should correctly aggregate alert statistics"""
        alerts = [
            AlertFormatter.create_alert('cpu', 85, 80, Severity.HIGH, time.time()),
            AlertFormatter.create_alert('memory', 95, 85, Severity.CRITICAL, time.time()),
            AlertFormatter.create_alert('disk', 92, 90, Severity.MEDIUM, time.time()),
        ]

        stats = StatisticsAggregator.aggregate(alerts, 15)

        self.assertEqual(3, stats['total_alerts'])
        self.assertEqual(1, stats['by_severity']['high'])
        self.assertEqual(1, stats['by_severity']['critical'])
        self.assertEqual(1, stats['by_severity']['medium'])


class TestBehaviorEquivalence(unittest.TestCase):
    """Test that refactored code behaves the same as original"""

    def setUp(self):
        """Set up test fixtures"""
        self.original = OriginalMonitor()
        self.refactored = RefactoredMonitor()

        # Clean up any existing log file
        if os.path.exists('alerts.log'):
            os.remove('alerts.log')

    def tearDown(self):
        """Clean up after tests"""
        if os.path.exists('alerts.log'):
            os.remove('alerts.log')

    def test_validation_errors_match(self):
        """Both versions should handle validation errors the same way"""
        invalid_metrics = None
        channels = ['console']

        original_result = self.original.process_metrics_and_send_alerts(
            invalid_metrics, channels
        )
        refactored_result = self.refactored.process_metrics_and_send_alerts(
            invalid_metrics, channels
        )

        # Both should have errors
        self.assertTrue(len(original_result['errors']) > 0)
        self.assertTrue(len(refactored_result['errors']) > 0)

        # Both should send no alerts
        self.assertEqual(0, original_result['alerts_sent'])
        self.assertEqual(0, refactored_result['alerts_sent'])

    def test_threshold_detection_matches(self):
        """Both versions should detect threshold violations the same way"""
        metrics = {
            'cpu': 85,  # Exceeds 80
            'memory': 92,  # Exceeds 85
            'disk': 70,  # Below 90
            'network': 40,  # Below 75
            'timestamp': time.time()
        }
        channels = ['console']

        original_result = self.original.process_metrics_and_send_alerts(
            metrics, channels, enable_throttling=False
        )
        refactored_result = self.refactored.process_metrics_and_send_alerts(
            metrics, channels, enable_throttling=False
        )

        # Both should send 2 alerts (cpu and memory)
        self.assertEqual(2, original_result['alerts_sent'])
        self.assertEqual(2, refactored_result['alerts_sent'])

    def test_throttling_behavior_matches(self):
        """Both versions should throttle alerts the same way"""
        metrics = {
            'cpu': 85,
            'memory': 70,
            'disk': 70,
            'network': 40,
            'timestamp': time.time()
        }
        channels = ['console']

        # First alert
        original_result1 = self.original.process_metrics_and_send_alerts(
            metrics, channels, enable_throttling=True
        )
        refactored_result1 = self.refactored.process_metrics_and_send_alerts(
            metrics, channels, enable_throttling=True
        )

        self.assertEqual(1, original_result1['alerts_sent'])
        self.assertEqual(1, refactored_result1['alerts_sent'])

        # Second alert immediately (should be throttled)
        original_result2 = self.original.process_metrics_and_send_alerts(
            metrics, channels, enable_throttling=True
        )
        refactored_result2 = self.refactored.process_metrics_and_send_alerts(
            metrics, channels, enable_throttling=True
        )

        self.assertEqual(0, original_result2['alerts_sent'])
        self.assertEqual(0, refactored_result2['alerts_sent'])

    def test_aggregation_matches(self):
        """Both versions should produce similar aggregation results"""
        metrics = {
            'cpu': 85,
            'memory': 92,
            'disk': 95,
            'network': 40,
            'timestamp': time.time()
        }
        channels = ['console']

        original_result = self.original.process_metrics_and_send_alerts(
            metrics, channels, enable_throttling=False, enable_aggregation=True
        )
        refactored_result = self.refactored.process_metrics_and_send_alerts(
            metrics, channels, enable_throttling=False
        )

        # Both should have aggregation data
        self.assertIsNotNone(original_result.get('aggregation'))
        self.assertIsNotNone(refactored_result.get('aggregation'))

        # Total alerts should match
        self.assertEqual(
            original_result['aggregation']['total_alerts'],
            refactored_result['aggregation']['total_alerts']
        )


def run_tests():
    """Run all tests"""
    unittest.main(argv=[''], verbosity=2, exit=False)


if __name__ == '__main__':
    run_tests()
