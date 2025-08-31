import React, { useState } from 'react';
import './timetable.scss';
import { createOrUpdateExamSlot, fetchExamSlot } from '../../../../api/Timetable'; // Adjust path as needed
import { useEffect } from 'react';
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
  const [overlaps, setOverlaps] = useState([]);

  console.log(examSlots);
  
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

  // Define slot schedules for overlap detection
  const slotSchedules = {
    'Monday': {
      '8:00 AM': ['A'],
      '9:00 AM': ['B', 'ML1'],
      '10:00 AM': ['C', 'ML1'],
      '11:00 AM': ['D', 'ML1'],
      '12:00 PM': ['F'],
      '1:00 PM': ['F1'],
      '2:00 PM': ['D1', 'AL1'],
      '3:00 PM': ['C1', 'AL1'],
      '4:00 PM': ['B1', 'AL1'],
      '5:00 PM': ['A1']
    },
    'Tuesday': {
      '8:00 AM': ['E'],
      '9:00 AM': ['A', 'ML2'],
      '10:00 AM': ['B', 'ML2'],
      '11:00 AM': ['C', 'ML2'],
      '12:00 PM': ['F'],
      '1:00 PM': ['F1'],
      '2:00 PM': ['C1', 'AL2'],
      '3:00 PM': ['B1', 'AL2'],
      '4:00 PM': ['A1', 'AL2'],
      '5:00 PM': ['E1']
    },
    'Wednesday': {
      '8:00 AM': ['D'],
      '9:00 AM': ['E', 'ML3'],
      '10:00 AM': ['A', 'ML3'],
      '11:00 AM': ['B', 'ML3'],
      '12:00 PM': ['G'],
      '1:00 PM': ['G1'],
      '2:00 PM': ['B1', 'AL3'],
      '3:00 PM': ['A1', 'AL3'],
      '4:00 PM': ['E1', 'AL3'],
      '5:00 PM': ['D1']
    },
    'Thursday': {
      '8:00 AM': ['C'],
      '9:00 AM': ['D', 'ML4'],
      '10:00 AM': ['E', 'ML4'],
      '11:00 AM': ['A', 'ML4'],
      '12:00 PM': ['G'],
      '1:00 PM': ['G1'],
      '2:00 PM': ['A1', 'AL4'],
      '3:00 PM': ['E1', 'AL4'],
      '4:00 PM': ['D1', 'AL4'],
      '5:00 PM': ['C1']
    },
    'Friday': {
      '8:00 AM': ['B'],
      '9:00 AM': ['C', 'ML5'],
      '10:00 AM': ['D', 'ML5'],
      '11:00 AM': ['F', 'ML5'],
      '12:00 PM': ['G'],
      '1:00 PM': ['G1'],
      '2:00 PM': ['F1', 'AL5'],
      '3:00 PM': ['D1', 'AL5'],
      '4:00 PM': ['C1', 'AL5'],
      '5:00 PM': ['B1']
    }
  };

  // Function to detect overlaps
  const detectOverlaps = (currentFormData) => {
    const foundOverlaps = [];
    
    Object.entries(slotSchedules).forEach(([day, daySchedule]) => {
      Object.entries(daySchedule).forEach(([time, slots]) => {
        // Check if multiple slots have courses assigned for the same time
        const activeCourses = slots.filter(slot => {
          const course = currentFormData[slot];
          return course && course.trim() !== '';
        });

        if (activeCourses.length > 1) {
          const courseDetails = activeCourses.map(slot => ({
            slot,
            course: currentFormData[slot]
          }));
          
          foundOverlaps.push({
            day,
            time,
            conflicts: courseDetails
          });
        }
      });
    });

    return foundOverlaps;
  };

  // Generate timetable data based on examSlots
  const generateTimetableData = () => {
    const daySchedule = {
      'Monday': {
        '8:00 AM': 'A',
        '9:00 AM': examSlots.ML1 ? 'ML1' : 'B',
        '10:00 AM': examSlots.ML1 ? 'ML1' : 'C',
        '11:00 AM': examSlots.ML1 ? 'ML1' : 'D',
        '12:00 PM': 'F',
        '1:00 PM': 'F1',
        '2:00 PM': examSlots.AL1 ? 'AL1' : 'D1',
        '3:00 PM': examSlots.AL1 ? 'AL1' : 'C1',
        '4:00 PM': examSlots.AL1 ? 'AL1' : 'B1',
        '5:00 PM': 'A1'
      },
      'Tuesday': {
        '8:00 AM': 'E',
        '9:00 AM': examSlots.ML2 ? 'ML2' : 'A',
        '10:00 AM': examSlots.ML2 ? 'ML2' : 'B',
        '11:00 AM': examSlots.ML2 ? 'ML2' : 'C',
        '12:00 PM': 'F',
        '1:00 PM': 'F1',
        '2:00 PM': examSlots.AL2 ? 'AL2' : 'C1',
        '3:00 PM': examSlots.AL2 ? 'AL2' : 'B1',
        '4:00 PM': examSlots.AL2 ? 'AL2' : 'A1',
        '5:00 PM': 'E1'
      },
      'Wednesday': {
        '8:00 AM': 'D',
        '9:00 AM': examSlots.ML3 ? 'ML3' : 'E',
        '10:00 AM': examSlots.ML3 ? 'ML3' : 'A',
        '11:00 AM': examSlots.ML3 ? 'ML3' : 'B',
        '12:00 PM': 'G',
        '1:00 PM': 'G1',
        '2:00 PM': examSlots.AL3 ? 'AL3' : 'B1',
        '3:00 PM': examSlots.AL3 ? 'AL3' : 'A1',
        '4:00 PM': examSlots.AL3 ? 'AL3' : 'E1',
        '5:00 PM': 'D1'
      },
      'Thursday': {
        '8:00 AM': 'C',
        '9:00 AM': examSlots.ML4 ? 'ML4' : 'D',
        '10:00 AM': examSlots.ML4 ? 'ML4' : 'E',
        '11:00 AM': examSlots.ML4 ? 'ML4' : 'A',
        '12:00 PM': 'G',
        '1:00 PM': 'G1',
        '2:00 PM': examSlots.AL4 ? 'AL4' : 'A1',
        '3:00 PM': examSlots.AL4 ? 'AL4' : 'E1',
        '4:00 PM': examSlots.AL4 ? 'AL4' : 'D1',
        '5:00 PM': 'C1'
      },
      'Friday': {
        '8:00 AM': 'B',
        '9:00 AM': examSlots.ML5 ? 'ML5' : 'C',
        '10:00 AM': examSlots.ML5 ? 'ML5' : 'D',
        '11:00 AM': examSlots.ML5 ? 'ML5' : 'F',
        '12:00 PM': 'G',
        '1:00 PM': 'G1',
        '2:00 PM': examSlots.AL5 ? 'AL5' : 'F1',
        '3:00 PM': examSlots.AL5 ? 'AL5' : 'D1',
        '4:00 PM': examSlots.AL5 ? 'AL5' : 'C1',
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
    const newFormData = {
      ...formData,
      [slot]: value
    };
    
    setFormData(newFormData);
    
    // Detect overlaps in real-time
    const currentOverlaps = detectOverlaps(newFormData);
    setOverlaps(currentOverlaps);
  };

  const handleFormSubmit = async () => {
    // Check for overlaps before submitting
    const currentOverlaps = detectOverlaps(formData);
    
    if (currentOverlaps.length > 0) {
      toast.error('Please resolve all schedule conflicts before saving!');
      return;
    }

    try {
      // Prepare the data for API request
      const examSlotData = {
        branch: user?.user?.department || user?.department,
        semester: user?.user?.semester || user?.semester,
        course: user?.user?.degree || user?.degree,

        // Regular slots
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
        G1: formData.G1 || '',

        // AL slots
        AL1: formData.AL1 || '',
        AL2: formData.AL2 || '',
        AL3: formData.AL3 || '',
        AL4: formData.AL4 || '',
        AL5: formData.AL5 || '',

        // ML slots
        ML1: formData.ML1 || '',
        ML2: formData.ML2 || '',
        ML3: formData.ML3 || '',
        ML4: formData.ML4 || '',
        ML5: formData.ML5 || ''
      };

      console.log('Submitting timetable data:', examSlotData);

      // Make API request
      const response = await createOrUpdateExamSlot(examSlotData);
      
      console.log('Timetable updated successfully:', response);
      toast.success('Timetable updated successfully!');
      
      // Update examSlots with new data
      setExamSlots(formData);
      
      // Clear overlaps and close form
      setOverlaps([]);
      setShowForm(false);
      
    } catch (error) {
      console.error('Error updating timetable:', error);
      toast.error('Failed to update timetable. Please try again.');
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setOverlaps([]);
    // Reset form data to current examSlots values
    setFormData({
      A: examSlots.A || '',
      B: examSlots.B || '',
      C: examSlots.C || '',
      D: examSlots.D || '',
      E: examSlots.E || '',
      F: examSlots.F || '',
      G: examSlots.G || '',
      A1: examSlots.A1 || '',
      B1: examSlots.B1 || '',
      C1: examSlots.C1 || '',
      D1: examSlots.D1 || '',
      E1: examSlots.E1 || '',
      F1: examSlots.F1 || '',
      G1: examSlots.G1 || '',
      ML1: examSlots.ML1 || '',
      ML2: examSlots.ML2 || '',
      ML3: examSlots.ML3 || '',
      ML4: examSlots.ML4 || '',
      ML5: examSlots.ML5 || '',
      AL1: examSlots.AL1 || '',
      AL2: examSlots.AL2 || '',
      AL3: examSlots.AL3 || '',
      AL4: examSlots.AL4 || '',
      AL5: examSlots.AL5 || ''
    });
  };

  const getSlotColor = (slot) => {
    const slotColors = {
      // Regular slots - vibrant colors matching the course cards
      'A': '#C8A8E9', // light purple
      'B': '#FFB3D1', // light pink
      'C': '#87CEEB', // light blue
      'D': '#DDA0DD', // plum
      'E': '#F0E68C', // khaki
      'F': '#FFE4B5', // moccasin
      'G': '#98FB98', // pale green
      
      // Lab slots - slightly darker versions
      'A1': '#B19CD9', // darker purple
      'B1': '#FF9AC1', // darker pink
      'C1': '#6BB6DB', // darker blue
      'D1': '#CD88CD', // darker plum
      'E1': '#E6D87C', // darker khaki
      'F1': '#FFDAB9', // darker moccasin
      'G1': '#90EE90', // darker pale green
      
      // Morning lab slots - rich colors
      'ML1': '#9370DB', // medium slate blue
      'ML2': '#FF69B4', // hot pink
      'ML3': '#4682B4', // steel blue
      'ML4': '#DA70D6', // orchid
      'ML5': '#FFD700', // gold
      
      // Afternoon lab slots - warm colors
      'AL1': '#87CEEB', // light blue
      'AL2': '#DDA0DD', // plum
      'AL3': '#F0E68C', // khaki
      'AL4': '#FFE4B5', // moccasin
      'AL5': '#98FB98', // pale green
    };
    return slotColors[slot] || '#f8f9fa';
  };

  // Check if user is BR (you can adjust this condition based on your user object structure)
  const isBR = user?.user?.isBR || user?.isBR;

  useEffect(() => {
    const fetchData = async () => {
      console.log(user);
      console.log(user?.user?.degree, user?.user?.department,user?.user?.semester);

      var branch = user?.user?.department;
      // replace spaces of branch with -
      branch = branch.replace(/ /g, '-');

      console.log(branch);

      const response = await fetchExamSlot(user?.user?.degree, branch,user?.user?.semester);
      
      setExamSlots(response);
      
      // Update formData with fetched exam slots
      const newFormData = {
        A: response.A || '',
        B: response.B || '',
        C: response.C || '',
        D: response.D || '',
        E: response.E || '',
        F: response.F || '',
        G: response.G || '',
        A1: response.A1 || '',
        B1: response.B1 || '',
        C1: response.C1 || '',
        D1: response.D1 || '',
        E1: response.E1 || '',
        F1: response.F1 || '',
        G1: response.G1 || '',
        ML1: response.ML1 || '',
        ML2: response.ML2 || '',
        ML3: response.ML3 || '',
        ML4: response.ML4 || '',
        ML5: response.ML5 || '',
        AL1: response.AL1 || '',
        AL2: response.AL2 || '',
        AL3: response.AL3 || '',
        AL4: response.AL4 || '',
        AL5: response.AL5 || ''
      };
      
      setFormData(newFormData);
      
      // Check for existing overlaps
      const initialOverlaps = detectOverlaps(newFormData);
      setOverlaps(initialOverlaps);
      
      console.log(response);
    };

    fetchData();
  }, [user]);

  const getInputStyle = (slot) => {
    // Check if this slot is part of any overlap
    const isInOverlap = overlaps.some(overlap => 
      overlap.conflicts.some(conflict => conflict.slot === slot)
    );

    return {
      width: '100%',
      padding: '8px',
      border: isInOverlap ? '2px solid #dc3545' : '1px solid #000000ff',
      borderRadius: '4px',
      fontSize: '14px',
      backgroundColor: isInOverlap ? '#fff5f5' : 'white'
    };
  };

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
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>Update Timetable Slots</h3>
            
            {/* Overlap Warning */}
            {overlaps.length > 0 && (
              <div style={{
                backgroundColor: '#f8d7da',
                border: '1px solid #f5c6cb',
                color: '#721c24',
                padding: '12px',
                borderRadius: '4px',
                marginBottom: '20px'
              }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>⚠️ Schedule Conflicts Detected:</h4>
                {overlaps.map((overlap, index) => (
                  <div key={index} style={{ marginBottom: '8px' }}>
                    <strong>{overlap.day} at {overlap.time}:</strong>
                    <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                      {overlap.conflicts.map((conflict, i) => (
                        <li key={i}>Slot {conflict.slot}: {conflict.course}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>
                  Please remove courses from conflicting slots or clear one of the overlapping entries.
                </p>
              </div>
            )}

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
                        style={getInputStyle(slot)}
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
                        style={getInputStyle(slot)}
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
                        style={getInputStyle(slot)}
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
                        {slot} (2-5):
                      </div>
                      <input
                        type="text"
                        value={formData[slot]}
                        onChange={(e) => handleInputChange(slot, e.target.value)}
                        placeholder={`Enter course for ${slot}`}
                        style={getInputStyle(slot)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button
                  onClick={handleFormSubmit}
                  disabled={overlaps.length > 0}
                  style={{
                    backgroundColor: overlaps.length > 0 ? '#6c757d' : '#28a745',
                    color: 'white',
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: overlaps.length > 0 ? 'not-allowed' : 'pointer',
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
                  className={`timetable-cell ${classData ? 'occupied' : 'empty'}`}
                  style={{
                    backgroundColor: classData ? getSlotColor(classData.room.replace('Slot ', '')) : '#f8f9fa',
                    border: 'none',
                    color: '#333',
                    fontWeight: classData ? 'bold' : 'normal'
                  }}
                >
                  {classData ? (
                    <div className="class-info">
                      <div className="subject-name" style={{ fontSize: '12px', marginBottom: '2px' }}>
                        {classData.subject}
                      </div>
                      <div className="room-info" style={{ fontSize: '10px', opacity: '0.8' }}>
                        {classData.room}
                      </div>
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