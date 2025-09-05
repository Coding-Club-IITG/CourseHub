import "./styles.scss";
import Container from "../../components/container";
import Heading from "../../components/heading";
import Space from "../../components/space";
import NavBar from "../../components/navbar";
import SubHeading from "../../components/subheading";
import Footer from "../../components/footer";
import QuizCard from "../dashboard/components/quizcard";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { getColors } from "../../utils/colors";
import { getQuizEvents, deleteQuizEvent, modifyQuizEvent } from "../../api/Quiz";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

// Custom hook to detect mobile view
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);
    return isMobile;
}

const MyQuizzes = () => {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingQuiz, setEditingQuiz] = useState(null);
    const [editForm, setEditForm] = useState({ eventName: "", eventDate: "", course: "" });
    const user = useSelector((state) => state.user);
    const navigate = useNavigate();
    const isMobile = useIsMobile();

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const fetchQuizzes = async () => {
        try {
            setLoading(true);
            const data = await getQuizEvents();
            console.log("Quizzes fetched:", data);
            setQuizzes(data || []);
        } catch (err) {
            console.error("Error fetching quizzes:", err);
            setQuizzes([]);
            toast.error("Failed to fetch quizzes");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteQuiz = async (quizId, quizName) => {
        if (!user.user?.isBR) {
            toast.error("Only Branch Representatives can delete quizzes");
            return;
        }

        if (window.confirm(`Are you sure you want to delete "${quizName}"?`)) {
            try {
                await deleteQuizEvent(quizId);
                toast.success("Quiz deleted successfully");
                fetchQuizzes(); // Refresh the list
            } catch (error) {
                console.error("Error deleting quiz:", error);
                toast.error("Failed to delete quiz");
            }
        }
    };

    const handleEditQuiz = (quiz) => {
        if (!user.user?.isBR) {
            toast.error("Only Branch Representatives can edit quizzes");
            return;
        }

        setEditingQuiz(quiz._id);
        setEditForm({
            eventName: quiz.eventName,
            eventDate: quiz.eventDate ? new Date(quiz.eventDate).toISOString().split('T')[0] : "",
            course: quiz.course
        });
    };

    const handleSaveEdit = async () => {
        if (!editForm.eventName || !editForm.eventDate || !editForm.course) {
            toast.error("Please fill in all fields");
            return;
        }

        try {
            await modifyQuizEvent(editingQuiz, editForm);
            toast.success("Quiz updated successfully");
            setEditingQuiz(null);
            setEditForm({ eventName: "", eventDate: "", course: "" });
            fetchQuizzes(); // Refresh the list
        } catch (error) {
            console.error("Error updating quiz:", error);
            toast.error("Failed to update quiz");
        }
    };

    const handleCancelEdit = () => {
        setEditingQuiz(null);
        setEditForm({ eventName: "", eventDate: "", course: "" });
    };

    if (loading) {
        return (
            <div className="App">
                <NavBar />
                <Container color={"dark"}>
                    <Space amount={50} />
                    <div className="loading-container">
                        <div className="loading-text">Loading quizzes...</div>
                    </div>
                </Container>
                <Footer />
            </div>
        );
    }

    return (
        <div className="App">
            <NavBar/>
            <Container color={"dark"}>
                <Space amount={20} />
                <div className="myquizzes-header">
                    <Heading text={"My Quizzes"} type={"bold"} color={"light"} />
                    <SubHeading 
                        text={"Manage and view your quiz schedule"} 
                        color={"light"} 
                    />
                </div>
                <Space amount={30} />

                {quizzes.length > 0 ? (
                    <div className={`quizzes-container ${isMobile ? 'mobile' : ''}`}>
                        {[...quizzes]
                            .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
                            .map((quiz, idx) => (
                                <div className="quiz-card" key={quiz._id || idx}>
                                    <QuizCard
                                        code={quiz.course}
                                        name={quiz.eventName}
                                        date={
                                            quiz.eventDate
                                                ? new Date(quiz.eventDate).toLocaleDateString()
                                                : ""
                                        }
                                        day={
                                            quiz.eventDate
                                                ? new Date(quiz.eventDate).toLocaleDateString(
                                                      "en-US",
                                                      {
                                                          weekday: "long",
                                                      }
                                                  )
                                                : ""
                                        }
                                        color={getColors(idx)}
                                    >
                                    {user.user?.isBR && (
                                        <div className="quiz-actions">
                                            <span
                                                className="rename-tick"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditQuiz(quiz);
                                                }}
                                                title="Edit Quiz"
                                            ></span>
                                            <span
                                                className="delete"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteQuiz(quiz._id, quiz.eventName);
                                                }}
                                                title="Delete Quiz"
                                            ></span>
                                        </div>
                                    )}
                                    </QuizCard>
                                </div>
                            ))}
                    </div>
                ) : (
                    <div className="no-quizzes">
                        <div className="no-quizzes-text">No quizzes scheduled</div>
                        <div className="no-quizzes-subtext">
                            {user.user?.isBR 
                                ? "Create quizzes from the dashboard to see them here"
                                : "Quizzes will appear here when they are scheduled"
                            }
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                {editingQuiz && (
                    <div className="edit-modal-overlay">
                        <div className="edit-modal">
                            <div className="edit-modal-header">
                                <Heading text={"Edit Quiz"} type={"bold"} color={"dark"} />
                                <button className="close-btn" onClick={handleCancelEdit}>×</button>
                            </div>
                            <div className="edit-modal-content">
                                <div className="form-group">
                                    <label>Quiz Name</label>
                                    <input
                                        type="text"
                                        value={editForm.eventName}
                                        onChange={(e) => setEditForm({...editForm, eventName: e.target.value})}
                                        placeholder="Enter quiz name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Course Code</label>
                                    <input
                                        type="text"
                                        value={editForm.course}
                                        onChange={(e) => setEditForm({...editForm, course: e.target.value})}
                                        placeholder="Enter course code"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Date</label>
                                    <input
                                        type="date"
                                        value={editForm.eventDate}
                                        onChange={(e) => setEditForm({...editForm, eventDate: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="edit-modal-actions">
                                <button className="cancel-btn" onClick={handleCancelEdit}>
                                    Cancel
                                </button>
                                <button className="save-btn" onClick={handleSaveEdit}>
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Container>
            <Footer />
        </div>
    );
};

export default MyQuizzes;
