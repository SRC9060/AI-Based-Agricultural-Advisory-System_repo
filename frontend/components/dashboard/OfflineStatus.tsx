interface OfflineStatusProps {
  cached: boolean;
  timestamp?: string;
}

export default function OfflineStatus({ cached, timestamp }: OfflineStatusProps) {
  if (!cached) {
    return null;
  }

  return (
    <div className="mt-1 text-sm text-amber-700">
      <p>📡 Showing Cached Data</p>
      {timestamp && (
        <p className="text-gray-500">
          Last Updated: {new Date(timestamp).toLocaleString()}
        </p>
      )}
    </div>
  );
}
