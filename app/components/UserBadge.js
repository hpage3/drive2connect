export default function UserBadge({ username }) {
  return (
    <div className="absolute top-5 left-5 bg-black/70 text-white px-4 py-2 rounded-lg z-50">
      You are <strong>{username}</strong>
    </div>
  );
}
