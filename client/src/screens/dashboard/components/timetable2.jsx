import React, { useState } from 'react';
import './timetable.scss';
import { createOrUpdateExamSlot } from '../../../api/Timetable'; // Adjust path as needed
import { toast } from 'react-toastify';

const Timetable = ({ user }) => {
  const [showForm, setShowForm] = useState(false);
  const [examSlots, setExamSlots] = useState({});
  const [formData, setFormData] = useState({
    A: '', B: '', C: '', D: '', E: '', F: '', G: '',
    A1: '', B1: '', C1: '', D1: '', E1: '', F1: '', G1: '',
    ML1: '', ML2: '', ML3: '', ML4: '', ML5: '',
    AL1: '', AL2: '', AL3: '', AL4: '', AL5: ''
  });

  const timeSlots = [
    '8:00 AM',
    '9:00 AM', 
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '1:00 PM',
    '2:00 PM',
    '3:00 PM',
    '4:00 PM',
    '5:00 PM'
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Generate timetable data based on examSlots
  const generateTimetableData = () => {
    const slotTimes = {
      'A': '8:00 AM',
      'B': '9:00 AM',
      'C': '10:00 AM',
      'D': '11:00 AM',
      'E': '8:00 AM',
      'F': '12:00 PM',
      'G': '12:00 PM',
      'A1': '5:00 PM',
      'B1': '4:00 PM',
      'C1': '3:00 PM',
      'D1': '2:00 PM',
      'E1': '5:00 PM',
      'F1': '1:00 PM',
      'G1': '1:00 PM'
    };

    const daySchedule = {
      'Monday': {
        '8:00 AM': 'A',
        '9:00 AM': examSlots.ML1 ? 'ML1' : 'B',
        '10:00 AM': examSlots.ML1 ? 'ML1' : 'C',
        '11:00 AM': examSlots.ML1 ? 'ML1' : 'D',
        '12:00 PM': 'F',
        '1:00 PM': 'F1',
        '2:00 PM': 'D1',
        '3:00 PM': examSlots.AL1 ? 'AL1' : 'C1',
        '4:00 PM': 'B1',
        '5:00 PM': 'A1'
      },
      'Tuesday': {
        '8:00 AM': 'E',
        '9:00 AM': examSlots.ML2 ? 'ML2' : 'A',
        '10:00 AM': examSlots.ML2 ? 'ML2' : 'B',
        '11:00 AM': examSlots.ML2 ? 'ML2' : 'C',
        '12:00 PM': 'F',
        '1:00 PM': 'F1',
        '2:00 PM': 'C1',
        '3:00 PM': examSlots.AL2 ? 'AL2' : 'B1',
        '4:00 PM': 'A1',
        '5:00 PM': 'E1'
      },
      'Wednesday': {
        '8:00 AM': 'D',
        '9:00 AM': examSlots.ML3 ? 'ML3' : 'E',
        '10:00 AM': examSlots.ML3 ? 'ML3' : 'A',
        '11:00 AM': examSlots.ML3 ? 'ML3' : 'B',
        '12:00 PM': 'G',
        '1:00 PM': 'G1',
        '2:00 PM': 'B1',
        '3:00 PM': examSlots.AL3 ? 'AL3' : 'A1',
        '4:00 PM': 'E1',
        '5:00 PM': 'D1'
      },
      'Thursday': {
        '8:00 AM': 'C',
        '9:00 AM': examSlots.ML4 ? 'ML4' : 'D',
        '10:00 AM': examSlots.ML4 ? 'ML4' : 'E',
        '11:00 AM': examSlots.ML4 ? 'ML4' : 'A',
        '12:00 PM': 'G',
        '1:00 PM': 'G1',
        '2:00 PM': 'A1',
        '3:00 PM': examSlots.AL4 ? 'AL4' : 'E1',
        '4:00 PM': 'D1',
        '5:00 PM': 'C1'
      },
      'Friday': {
        '8:00 AM': 'B',
        '9:00 AM': examSlots.ML5 ? 'ML5' : 'C',
        '10:00 AM': examSlots.ML5 ? 'ML5' : 'D',
        '11:00 AM': examSlots.ML5 ? 'ML5' : 'F',
        '12:00 PM': 'G',
        '1:00 PM': 'G1',
        '2:00 PM': 'F1',
        '3:00 PM': examSlots.AL5 ? 'AL5' : 'D1',
        '4:00 PM': 'C1',
        '5:00 PM': 'B1'
      }
    };

    const timetableData = {};
    
    days.forEach(day => {
      timetableData[day] = {};
      Object.entries(daySchedule[day]).forEach(([time, slot]) => {
        const courseCode = examSlots[slot];
        if (courseCode && courseCode.trim() !== '') {
          timetableData[day][time] = {
            subject: courseCode,
            room: `Slot ${slot}`,
            type: slot.includes('L') ? 'lab' : 'lecture'
          };
        }
      });
    });

    return timetableData;
  };

  const timetableData = generateTimetableData();

  const handleInputChange = (slot, value) => {
    setFormData(prev => ({
      ...prev,
      [slot]: value
    }));
  };

  const handleFormSubmit = async () => {
    try {
      // Prepare the data for API request
      const examSlotData = {
        department: user?.user?.department || user?.department,
        semester: user?.user?.semester || user?.semester,
        branch: user?.user?.branch || user?.branch,
        // Include all slots (A-G and A1-G1), even if empty
        A: formData.A || '',
        B: formData.B || '',
        C: formData.C || '',
        D: formData.D || '',
        E: formData.E || '',
        F: formData.F || '',
        G: formData.G || '',
        A1: formData.A1 || '',
        B1: formData.B1 || '',
        C1: formData.C1 || '',
        D1: formData.D1 || '',
        E1: formData.E1 || '',
        F1: formData.F1 || '',
        G1: formData.G1 || ''
      };

      console.log('Submitting timetable data:', examSlotData);

      // Make API request
      const response = await createOrUpdateExamSlot(examSlotData);
      
      console.log('Timetable updated successfully:', response);
      toast.success('Timetable updated successfully!');
      
      // Close form after successful submission
      setShowForm(false);
      
    } catch (error) {
      console.error('Error updating timetable:', error);
      toast.error('Failed to update timetable. Please try again.');
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    // Reset form data if needed
    // setFormData({
    //   A: '', B: '', C: '', D: '', E: '', F: '', G: '',
    //   A1: '', B1: '', C1: '', D1: '', E1: '', F1: '', G1: ''
    // });
  };

  const getClassType = (type) => {
    const typeClasses = {
      lecture: 'lecture',
      lab: 'lab',
      practical: 'practical',
      tutorial: 'tutorial',
      project: 'project',
      seminar: 'seminar',
      study: 'study'
    };
    return typeClasses[type] || 'default';
  };

  // Check if user is BR (you can adjust this condition based on your user object structure)
  const isBR = user?.user?.isBR || user?.isBR;

  return (
    <div className="timetable-container">
      {/* BR Form Button and Modal */}
      {isBR && (
        <div className="br-form-section" style={{ marginBottom: '20px', textAlign: 'center' }}>
          <button 
            onClick={() => setShowForm(true)}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Update Timetable Slots
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>Update Timetable Slots</h3>
            <div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px',
                marginBottom: '20px'
              }}>
                {/* Regular slots A-G */}
                <div>
                  <h4 style={{ marginBottom: '10px', color: '#333' }}>Regular Slots</h4>
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(slot => (
                    <div key={slot} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Slot {slot}:
                      </div>
                      <input
                        type="text"
                        value={formData[slot]}
                        onChange={(e) => handleInputChange(slot, e.target.value)}
                        placeholder={`Enter course for slot ${slot}`}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Lab slots A1-G1 */}
                <div>
                  <h4 style={{ marginBottom: '10px', color: '#333' }}>Lab Slots</h4>
                  {['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1'].map(slot => (
                    <div key={slot} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Slot {slot}:
                      </div>
                      <input
                        type="text"
                        value={formData[slot]}
                        onChange={(e) => handleInputChange(slot, e.target.value)}
                        placeholder={`Enter course for slot ${slot}`}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* ML slots ML1-ML5 */}
                <div>
                  <h4 style={{ marginBottom: '10px', color: '#333' }}>Morning Lab Slots</h4>
                  {['ML1', 'ML2', 'ML3', 'ML4', 'ML5'].map(slot => (
                    <div key={slot} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        {slot} (9-12):
                      </div>
                      <input
                        type="text"
                        value={formData[slot]}
                        onChange={(e) => handleInputChange(slot, e.target.value)}
                        placeholder={`Enter course for ${slot}`}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* AL slots AL1-AL5 */}
                <div>
                  <h4 style={{ marginBottom: '10px', color: '#333' }}>Afternoon Lab Slots</h4>
                  {['AL1', 'AL2', 'AL3', 'AL4', 'AL5'].map(slot => (
                    <div key={slot} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        {slot} (3-6):
                      </div>
                      <input
                        type="text"
                        value={formData[slot]}
                        onChange={(e) => handleInputChange(slot, e.target.value)}
                        placeholder={`Enter course for ${slot}`}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button
                  onClick={handleFormSubmit}
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Save Changes
                </button>
                <button
                  onClick={handleFormCancel}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Original Timetable */}
      <div className="timetable-grid">
        {/* Header row with time slots */}
        <div className="time-header"></div>
        {timeSlots.map((time) => (
          <div key={time} className="time-slot-header">
            {time}
          </div>
        ))}

        {/* Day rows */}
        {days.map((day) => (
          <React.Fragment key={day}>
            <div className="day-header">{day}</div>
            {timeSlots.map((time) => {
              const classData = timetableData[day]?.[time];
              return (
                <div
                  key={`${day}-${time}`}
                  className={`timetable-cell ${classData ? `occupied ${getClassType(classData.type)}` : 'empty'}`}
                >
                  {classData ? (
                    <div className="class-info">
                      <div className="subject-name">{classData.subject}</div>
                      <div className="room-info">{classData.room}</div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Timetable;