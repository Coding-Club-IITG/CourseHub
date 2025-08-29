import React, { useState } from 'react';
import './timetable.scss';

const Timetable = ({ user }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    A: '', B: '', C: '', D: '', E: '', F: '', G: '',
    A1: '', B1: '', C1: '', D1: '', E1: '', F1: '', G1: ''
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

  // Sample timetable data - you can replace this with your actual data structure
  const timetableData = {
    'Monday': {
      '9:00 AM': { subject: 'Mathematics', room: 'Room 101', type: 'lecture' },
      '11:00 AM': { subject: 'Physics Lab', room: 'Lab 201', type: 'lab' },
      '2:00 PM': { subject: 'Computer Science', room: 'Room 305', type: 'lecture' }
    },
    'Tuesday': {
      '10:00 AM': { subject: 'Chemistry', room: 'Room 203', type: 'lecture' },
      '1:00 PM': { subject: 'Engineering Drawing', room: 'Room 401', type: 'practical' },
      '3:00 PM': { subject: 'English', room: 'Room 102', type: 'lecture' }
    },
    'Wednesday': {
      '9:00 AM': { subject: 'Mathematics', room: 'Room 101', type: 'lecture' },
      '12:00 PM': { subject: 'Workshop', room: 'Workshop', type: 'practical' },
      '4:00 PM': { subject: 'Tutorial', room: 'Room 205', type: 'tutorial' }
    },
    'Thursday': {
      '8:00 AM': { subject: 'Early Morning Lecture', room: 'Room 301', type: 'lecture' },
      '11:00 AM': { subject: 'Physics', room: 'Room 204', type: 'lecture' },
      '2:00 PM': { subject: 'Lab Session', room: 'Lab 301', type: 'lab' }
    },
    'Friday': {
      '10:00 AM': { subject: 'Project Work', room: 'Room 501', type: 'project' },
      '1:00 PM': { subject: 'Seminar', room: 'Seminar Hall', type: 'seminar' },
      '3:00 PM': { subject: 'Study Period', room: 'Library', type: 'study' }
    }
  };

  const handleInputChange = (slot, value) => {
    setFormData(prev => ({
      ...prev,
      [slot]: value
    }));
  };

  const handleFormSubmit = () => {
    console.log('Timetable Form Data:', formData);
    
    // Log only non-empty slots
    const filledSlots = Object.entries(formData).filter(([key, value]) => value.trim() !== '');
    console.log('Filled Slots:', filledSlots);
    
    // Close form after submission
    setShowForm(false);
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