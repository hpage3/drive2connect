export default function Status({ message }) {
  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white bg-black/50 px-3 py-1 rounded-md z-50">
      {message}
    </div>
  );
}
