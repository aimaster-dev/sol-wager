import React, { useState } from 'react';

interface WagerCreationFormProps {
  onSubmit: (wagerData: {
    name: string;
    description: string;
    openingTime: number;
    conclusionTime: number;
    conclusionDetails: string;
  }) => void;
  onCancel: () => void;
}

const WagerCreationForm: React.FC<WagerCreationFormProps> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [openingDate, setOpeningDate] = useState('');
  const [openingTime, setOpeningTime] = useState('');
  const [conclusionDate, setConclusionDate] = useState('');
  const [conclusionTime, setConclusionTime] = useState('');
  const [conclusionDetails, setConclusionDetails] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.length > 50) {
      newErrors.name = 'Name must be less than 50 characters';
    }
    
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }
    
    if (!openingDate || !openingTime) {
      newErrors.openingTime = 'Opening date and time are required';
    }
    
    if (!conclusionDate || !conclusionTime) {
      newErrors.conclusionTime = 'Conclusion date and time are required';
    }
    
    if (!conclusionDetails.trim()) {
      newErrors.conclusionDetails = 'Conclusion details are required';
    } else if (conclusionDetails.length > 500) {
      newErrors.conclusionDetails = 'Conclusion details must be less than 500 characters';
    }
    
    // Check if opening time is in the future
    const openingTimestamp = new Date(`${openingDate}T${openingTime}`).getTime() / 1000;
    if (openingTimestamp <= Math.floor(Date.now() / 1000)) {
      newErrors.openingTime = 'Opening time must be in the future';
    }
    
    // Check if conclusion time is after opening time
    const conclusionTimestamp = new Date(`${conclusionDate}T${conclusionTime}`).getTime() / 1000;
    if (conclusionTimestamp <= openingTimestamp) {
      newErrors.conclusionTime = 'Conclusion time must be after opening time';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      const openingTimestamp = Math.floor(new Date(`${openingDate}T${openingTime}`).getTime() / 1000);
      const conclusionTimestamp = Math.floor(new Date(`${conclusionDate}T${conclusionTime}`).getTime() / 1000);
      
      onSubmit({
        name,
        description,
        openingTime: openingTimestamp,
        conclusionTime: conclusionTimestamp,
        conclusionDetails,
      });
    }
  };
  
  return (
    <div className="wager-creation-form">
      <h2>Create a New Wager</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="wager-name" className="form-label">Wager Name</label>
          <input 
            type="text"
            className={`form-control ${errors.name ? 'is-invalid' : ''}`}
            id="wager-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Will Team A win the championship?"
            maxLength={50}
          />
          {errors.name && <div className="invalid-feedback">{errors.name}</div>}
          <div className="form-text">Maximum 50 characters</div>
        </div>
        
        <div className="mb-3">
          <label htmlFor="wager-description" className="form-label">Description</label>
          <textarea 
            className={`form-control ${errors.description ? 'is-invalid' : ''}`}
            id="wager-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Provide details about the wager proposition"
            maxLength={500}
          />
          {errors.description && <div className="invalid-feedback">{errors.description}</div>}
          <div className="form-text">Maximum 500 characters</div>
        </div>
        
        <div className="row mb-3">
          <div className="col">
            <label htmlFor="opening-date" className="form-label">Opening Date</label>
            <input 
              type="date"
              className={`form-control ${errors.openingTime ? 'is-invalid' : ''}`}
              id="opening-date"
              value={openingDate}
              onChange={(e) => setOpeningDate(e.target.value)}
            />
          </div>
          <div className="col">
            <label htmlFor="opening-time" className="form-label">Opening Time</label>
            <input 
              type="time"
              className={`form-control ${errors.openingTime ? 'is-invalid' : ''}`}
              id="opening-time"
              value={openingTime}
              onChange={(e) => setOpeningTime(e.target.value)}
            />
          </div>
          {errors.openingTime && <div className="invalid-feedback">{errors.openingTime}</div>}
        </div>
        
        <div className="row mb-3">
          <div className="col">
            <label htmlFor="conclusion-date" className="form-label">Conclusion Date</label>
            <input 
              type="date"
              className={`form-control ${errors.conclusionTime ? 'is-invalid' : ''}`}
              id="conclusion-date"
              value={conclusionDate}
              onChange={(e) => setConclusionDate(e.target.value)}
            />
          </div>
          <div className="col">
            <label htmlFor="conclusion-time" className="form-label">Conclusion Time</label>
            <input 
              type="time"
              className={`form-control ${errors.conclusionTime ? 'is-invalid' : ''}`}
              id="conclusion-time"
              value={conclusionTime}
              onChange={(e) => setConclusionTime(e.target.value)}
            />
          </div>
          {errors.conclusionTime && <div className="invalid-feedback">{errors.conclusionTime}</div>}
        </div>
        
        <div className="mb-3">
          <label htmlFor="conclusion-details" className="form-label">Conclusion Details</label>
          <textarea 
            className={`form-control ${errors.conclusionDetails ? 'is-invalid' : ''}`}
            id="conclusion-details"
            value={conclusionDetails}
            onChange={(e) => setConclusionDetails(e.target.value)}
            rows={3}
            placeholder="Explain how the wager will be resolved (e.g., official match result, specific criteria)"
            maxLength={500}
          />
          {errors.conclusionDetails && <div className="invalid-feedback">{errors.conclusionDetails}</div>}
          <div className="form-text">Maximum 500 characters</div>
        </div>
        
        <div className="d-flex justify-content-end">
          <button 
            type="button" 
            className="btn btn-secondary me-2"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">Create Wager</button>
        </div>
      </form>
    </div>
  );
};

export default WagerCreationForm;
