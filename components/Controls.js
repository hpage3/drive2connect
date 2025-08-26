export default function Controls({ isMuted, toggleMute, send }) {
  return (
    <div className="controls">
      <button onClick={toggleMute} className="mute-btn">
        {isMuted ? "Unmute" : "Mute"}
      </button>
      <button className="like-btn" onClick={() => send("like")}>👍</button>
      <button className="dislike-btn" onClick={() => send("dislike")}>👎</button>
      <button className="report-btn" onClick={() => send("report")}>Report</button>
    </div>
  );
}
