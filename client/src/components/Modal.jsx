function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}>
            X
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
