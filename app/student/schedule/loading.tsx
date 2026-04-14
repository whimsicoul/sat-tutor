export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-36" />
      <div className="h-4 bg-gray-100 rounded w-64" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-28 bg-gray-100 rounded-xl border border-gray-200" />
      ))}
    </div>
  );
}
