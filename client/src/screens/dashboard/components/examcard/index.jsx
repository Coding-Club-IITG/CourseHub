import "./styles.scss";
const ExamCard = ({ days, name, color, onClick=()=>{} }) => {
	return (
		<div className="exam-card" style={{ backgroundColor: color }} onClick={onClick}>
			<div className="ndays">
				<p className="days">{days ? days : 0}</p>
			</div>
			<div className="exam-name">
				<p className="name">Days for</p>
				<p className="name">{name ? name : "Mid-Sem Exam"}</p>
			</div>
		</div>
	);
};

export default ExamCard;
