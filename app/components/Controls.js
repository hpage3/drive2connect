export default function Controls({ isMuted, onMuteToggle, onReaction }) {
  return (
    <div className="controls">
      <button onClick={onMuteToggle} className="mute-btn">
        {isMuted ? "Unmute" : "Mute"}
      </button>
      <button className="like-btn" onClick={() => onReaction("like")}>👍</button>
      <button className="dislike-btn" onClick={() => onReaction("dislike")}>👎</button>
      <button className="report-btn" onClick={() => onReaction("report")}>Report</button>
    </div>
  );
}
