"""
Sentinel-Copilot: A system monitoring and alerting service (REFACTORED)

This version demonstrates clean code principles:
- Single Responsibility Principle
- Clear separation of concerns
- Improved testability
- Better readability
"""

import json
import time
import os
import sys
import threading
import queue
import atexit
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
from pathlib import Path


class Config:
    """Manages configuration loading from JSON file"""

    def __init__(self, config_path: Optional[str] = None):
        """
        Load configuration from JSON file.

        Args:
            config_path: Path to config file. If None, uses config.json or config_default.json
        """
        if config_path is None:
            # Try config.json first, then config_default.json
            if os.path.exists('config.json'):
                config_path = 'config.json'
            else:
                config_path = 'config_default.json'

        try:
            with open(config_path, 'r') as f:
                self._config = json.load(f)
        except (IOError, OSError, json.JSONDecodeError) as e:
            # Fall back to defaults if config file doesn't exist or is invalid
            self._config = self._get_default_config()

    @staticmethod
    def _get_default_config() -> Dict[str, Any]:
        """Return default configuration"""
        return {
            'thresholds': {
                'cpu': 80,
                'memory': 85,
                'disk': 90,
                'network': 75
            },
            'severity': {
                'critical_ratio': 1.5,
                'high_ratio': 1.2,
                'medium_ratio': 1.0
            },
            'throttling': {
                'enabled': True,
                'throttle_minutes': 15
            },
            'channels': {
                'log_file': 'alerts.log',
                'default_channels': ['console', 'log']
            },
            'async_io': {
                'enabled': True,
                'queue_size': 1000
            }
        }

    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value by dot-notation key (e.g., 'throttling.enabled')"""
        keys = key.split('.')
        value = self._config
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        return value

    @property
    def thresholds(self) -> Dict[str, int]:
        """Get threshold configuration"""
        return self._config.get('thresholds', {})

    @property
    def severity_ratios(self) -> Dict[str, float]:
        """Get severity ratio configuration"""
        return self._config.get('severity', {})

    @property
    def throttle_minutes(self) -> int:
        """Get throttle minutes configuration"""
        return self._config.get('throttling', {}).get('throttle_minutes', 15)

    @property
    def log_file(self) -> str:
        """Get log file path configuration"""
        return self._config.get('channels', {}).get('log_file', 'alerts.log')

    @property
    def async_enabled(self) -> bool:
        """Check if async I/O is enabled"""
        return self._config.get('async_io', {}).get('enabled', True)


class Severity(Enum):
    """Alert severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class Alert:
    """Represents a system alert"""
    message: str
    severity: Severity
    metric_type: str
    value: float
    threshold: float
    timestamp: float


@dataclass
class ProcessingResult:
    """Result of metrics processing"""
    alerts_sent: int = 0
    errors: List[str] = None
    processed_metrics: List[str] = None
    aggregation: Dict[str, Any] = None

    def __post_init__(self):
        if self.errors is None:
            self.errors = []
        if self.processed_metrics is None:
            self.processed_metrics = []


class MetricsValidator:
    """Validates incoming metrics data"""

    REQUIRED_KEYS = ['cpu', 'memory', 'disk', 'network', 'timestamp']

    @staticmethod
    def validate(metrics: Dict[str, Any]) -> List[str]:
        """
        Validate metrics dictionary.

        Returns:
            List of error messages (empty if valid)
        """
        errors = []

        if not metrics or not isinstance(metrics, dict):
            errors.append('Invalid metrics format')
            return errors

        for key in MetricsValidator.REQUIRED_KEYS:
            if key not in metrics:
                errors.append(f'Missing required key: {key}')

        return errors


class SeverityCalculator:
    """Calculates alert severity based on threshold exceedance"""

    def __init__(self, config: Optional[Config] = None):
        """
        Initialize calculator with configuration.

        Args:
            config: Optional Config object. If None, uses defaults.
        """
        self.config = config or Config()
        self.critical_ratio = self.config.severity_ratios.get('critical_ratio', 1.5)
        self.high_ratio = self.config.severity_ratios.get('high_ratio', 1.2)
        self.medium_ratio = self.config.severity_ratios.get('medium_ratio', 1.0)

    def calculate(
        self,
        value: float,
        threshold: float,
        custom_severity: Optional[str] = None
    ) -> Severity:
        """
        Calculate severity level based on how much the value exceeds threshold.

        Args:
            value: Current metric value
            threshold: Threshold value
            custom_severity: Optional custom severity override

        Returns:
            Severity enum value
        """
        if custom_severity:
            return Severity(custom_severity)

        excess_ratio = value / threshold

        if excess_ratio > self.critical_ratio:
            return Severity.CRITICAL
        elif excess_ratio > self.high_ratio:
            return Severity.HIGH
        elif excess_ratio > self.medium_ratio:
            return Severity.MEDIUM
        else:
            return Severity.LOW


class AlertThrottler:
    """Manages alert throttling to prevent spam using O(1) dict lookup"""

    def __init__(self, throttle_minutes: int = 15):
        self.throttle_minutes = throttle_minutes
        # Use dict for O(1) lookup instead of list for O(n)
        self.alert_history: Dict[str, Dict[str, Any]] = {}

    def should_send_alert(self, metric_type: str) -> bool:
        """
        Check if an alert should be sent based on throttling rules.
        Uses O(1) dict lookup for performance.

        Args:
            metric_type: Type of metric being alerted on

        Returns:
            True if alert should be sent, False if throttled
        """
        if metric_type not in self.alert_history:
            return True

        current_time = time.time()
        last_alert = self.alert_history[metric_type]
        time_elapsed_minutes = (current_time - last_alert['timestamp']) / 60

        return time_elapsed_minutes >= self.throttle_minutes

    def record_alert(self, metric_type: str, severity: Severity, value: float):
        """Record that an alert was sent"""
        self.alert_history[metric_type] = {
            'timestamp': time.time(),
            'severity': severity.value,
            'value': value
        }


class AlertFormatter:
    """Formats alert messages"""

    @staticmethod
    def format_message(
        metric_type: str,
        value: float,
        threshold: float,
        severity: Severity,
        timestamp: float
    ) -> str:
        """
        Create a formatted alert message.

        Args:
            metric_type: Type of metric
            value: Current value
            threshold: Threshold value
            severity: Alert severity
            timestamp: Unix timestamp

        Returns:
            Formatted alert message string
        """
        formatted_time = datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')
        message = (
            f"[{severity.value.upper()}] {metric_type.upper()} alert: "
            f"{value}% (threshold: {threshold}%) at {formatted_time}"
        )
        return message

    @staticmethod
    def create_alert(
        metric_type: str,
        value: float,
        threshold: float,
        severity: Severity,
        timestamp: float
    ) -> Alert:
        """Create an Alert object with formatted message"""
        message = AlertFormatter.format_message(
            metric_type, value, threshold, severity, timestamp
        )

        return Alert(
            message=message,
            severity=severity,
            metric_type=metric_type,
            value=value,
            threshold=threshold,
            timestamp=timestamp
        )


class AlertChannel:
    """Base class for alert delivery channels"""

    def send(self, alert: Alert) -> Optional[str]:
        """
        Send alert through this channel.

        Returns:
            Error message if failed, None if successful
        """
        raise NotImplementedError


class ConsoleChannel(AlertChannel):
    """Sends alerts to console"""

    def send(self, alert: Alert) -> Optional[str]:
        print(alert.message)
        return None


class LogFileChannel(AlertChannel):
    """Sends alerts to a log file (synchronous)"""

    def __init__(self, log_file: str = 'alerts.log'):
        self.log_file = log_file

    def send(self, alert: Alert) -> Optional[str]:
        try:
            with open(self.log_file, 'a') as f:
                f.write(f"{alert.message}\n")
            return None
        except (IOError, OSError, PermissionError) as e:
            return f"Failed to write to log: {str(e)}"
        except ValueError as e:
            return f"Invalid log file path: {str(e)}"


class AsyncLogFileChannel(AlertChannel):
    """Sends alerts to a log file asynchronously using a background thread"""

    def __init__(self, log_file: str = 'alerts.log', queue_size: int = 1000):
        self.log_file = log_file
        self.write_queue: queue.Queue = queue.Queue(maxsize=queue_size)
        self.stop_event = threading.Event()
        self.worker_thread = threading.Thread(target=self._write_worker, daemon=True)
        self.worker_thread.start()

        # Register cleanup on exit
        atexit.register(self.shutdown)

    def _write_worker(self):
        """Background worker that writes alerts to file"""
        while not self.stop_event.is_set():
            try:
                # Wait for messages with timeout to allow checking stop_event
                alert_message = self.write_queue.get(timeout=0.5)
                try:
                    with open(self.log_file, 'a') as f:
                        f.write(f"{alert_message}\n")
                except (IOError, OSError, PermissionError) as e:
                    # Log error to stderr since we can't return it
                    print(f"Async log write error: {e}", file=sys.stderr)
                finally:
                    self.write_queue.task_done()
            except queue.Empty:
                continue

    def send(self, alert: Alert) -> Optional[str]:
        """Queue alert for async writing"""
        try:
            self.write_queue.put_nowait(alert.message)
            return None
        except queue.Full:
            return "Alert queue is full - message dropped"

    def shutdown(self):
        """Gracefully shutdown the async writer"""
        # Wait for queue to be processed
        self.write_queue.join()
        # Signal worker to stop
        self.stop_event.set()
        # Wait for worker to finish
        if self.worker_thread.is_alive():
            self.worker_thread.join(timeout=2.0)


class CustomHandlerChannel(AlertChannel):
    """Sends alerts using a custom handler function"""

    def __init__(self, name: str, handler_func):
        self.name = name
        self.handler_func = handler_func

    def send(self, alert: Alert) -> Optional[str]:
        try:
            self.handler_func(alert)
            return None
        except (TypeError, ValueError, AttributeError) as e:
            return f"Custom handler '{self.name}' failed with argument error: {str(e)}"
        except (IOError, OSError) as e:
            return f"Custom handler '{self.name}' failed with I/O error: {str(e)}"
        except Exception as e:
            # Fallback for truly unexpected errors
            return f"Custom handler '{self.name}' failed unexpectedly: {type(e).__name__}: {str(e)}"


class ChannelManager:
    """Manages alert delivery across multiple channels"""

    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config()

        # Use async log channel if enabled in config
        if self.config.async_enabled:
            queue_size = self.config.get('async_io.queue_size', 1000)
            log_channel = AsyncLogFileChannel(self.config.log_file, queue_size)
        else:
            log_channel = LogFileChannel(self.config.log_file)

        self.channels: Dict[str, AlertChannel] = {
            'console': ConsoleChannel(),
            'log': log_channel
        }

    def add_custom_channel(self, name: str, handler):
        """Add a custom alert channel"""
        self.channels[name] = CustomHandlerChannel(name, handler)

    def send_alert(self, alert: Alert, channel_names: List[str]) -> List[str]:
        """
        Send alert to specified channels.

        Returns:
            List of error messages (empty if all successful)
        """
        errors = []

        for channel_name in channel_names:
            if channel_name not in self.channels:
                errors.append(f"Unknown channel: {channel_name}")
                continue

            error = self.channels[channel_name].send(alert)
            if error:
                errors.append(error)

        return errors


class StatisticsAggregator:
    """Aggregates statistics about alerts"""

    @staticmethod
    def aggregate(alerts: List[Alert], throttle_minutes: int) -> Dict[str, Any]:
        """
        Aggregate statistics from a list of alerts.

        Args:
            alerts: List of Alert objects
            throttle_minutes: Throttling window for context

        Returns:
            Dictionary containing aggregated statistics
        """
        if not alerts:
            return {}

        severity_counts = {}
        for alert in alerts:
            severity = alert.severity.value
            severity_counts[severity] = severity_counts.get(severity, 0) + 1

        return {
            'total_alerts': len(alerts),
            'by_severity': severity_counts,
            'time_window': f"{throttle_minutes} minutes"
        }


class SystemMonitor:
    """
    Main system monitoring class (REFACTORED).

    This version breaks down complexity into focused, testable components.
    """

    def __init__(self, throttle_minutes: Optional[int] = None, config: Optional[Config] = None):
        self.config = config or Config()
        self.thresholds = self.config.thresholds

        # Use provided throttle_minutes or fall back to config
        if throttle_minutes is None:
            throttle_minutes = self.config.throttle_minutes

        self.throttler = AlertThrottler(throttle_minutes)
        self.channel_manager = ChannelManager(self.config)
        self.severity_calculator = SeverityCalculator(self.config)

    def add_custom_channel(self, name: str, handler):
        """Add a custom alert delivery channel"""
        self.channel_manager.add_custom_channel(name, handler)

    def process_metrics_and_send_alerts(
        self,
        metrics: Dict[str, Any],
        alert_channels: List[str],
        enable_throttling: bool = True,
        severity_levels: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Process system metrics and send alerts if thresholds are exceeded.

        This refactored version delegates to specialized components for:
        - Validation (MetricsValidator)
        - Severity calculation (SeverityCalculator)
        - Throttling (AlertThrottler)
        - Formatting (AlertFormatter)
        - Channel delivery (ChannelManager)
        - Aggregation (StatisticsAggregator)

        Args:
            metrics: Dictionary of metric values
            alert_channels: List of channel names to send alerts to
            enable_throttling: Whether to throttle repeated alerts
            severity_levels: Optional custom severity levels per metric

        Returns:
            ProcessingResult with alerts sent, errors, and statistics
        """
        result = ProcessingResult()

        # Validate input
        validation_errors = MetricsValidator.validate(metrics)
        if validation_errors:
            result.errors.extend(validation_errors)
            return result.__dict__

        # Process each metric
        alerts_sent = []

        for metric_type, value in metrics.items():
            if metric_type == 'timestamp':
                continue

            if metric_type not in self.thresholds:
                continue

            threshold = self.thresholds[metric_type]

            # Check if threshold is exceeded
            if value <= threshold:
                result.processed_metrics.append(metric_type)
                continue

            # Calculate severity
            custom_severity = severity_levels.get(metric_type) if severity_levels else None
            severity = self.severity_calculator.calculate(value, threshold, custom_severity)

            # Check throttling
            if enable_throttling and not self.throttler.should_send_alert(metric_type):
                result.processed_metrics.append(metric_type)
                continue

            # Create alert
            alert = AlertFormatter.create_alert(
                metric_type, value, threshold, severity, metrics['timestamp']
            )

            # Send to channels
            channel_errors = self.channel_manager.send_alert(alert, alert_channels)
            result.errors.extend(channel_errors)

            # Record in history
            self.throttler.record_alert(metric_type, severity, value)

            alerts_sent.append(alert)
            result.alerts_sent += 1
            result.processed_metrics.append(metric_type)

        # Aggregate statistics
        if alerts_sent:
            result.aggregation = StatisticsAggregator.aggregate(
                alerts_sent,
                self.throttler.throttle_minutes
            )

        return {
            'alerts_sent': result.alerts_sent,
            'errors': result.errors,
            'processed_metrics': result.processed_metrics,
            'aggregation': result.aggregation
        }


def main():
    """Example usage of refactored code"""
    monitor = SystemMonitor(throttle_minutes=15)

    # Simulate some metrics
    metrics = {
        'cpu': 85,
        'memory': 92,
        'disk': 75,
        'network': 45,
        'timestamp': time.time()
    }

    channels = ['console', 'log']

    result = monitor.process_metrics_and_send_alerts(
        metrics,
        channels,
        enable_throttling=True
    )

    print(f"\nProcessing result: {json.dumps(result, indent=2)}")


if __name__ == '__main__':
    main()
