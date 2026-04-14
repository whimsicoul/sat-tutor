export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-40" />
      <div className="h-48 bg-gray-100 rounded-xl border border-gray-200" />
      <div className="h-4 bg-gray-100 rounded w-32" />
      {[1, 2].map((i) => (
        <div key={i} className="h-20 bg-gray-100 rounded-xl border border-gray-200" />
      ))}
    </div>
  );
}
