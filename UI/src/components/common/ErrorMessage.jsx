// src/components/common/ErrorMessage.jsx
function ErrorMessage({ message = "Something went wrong. Please try again." }) {
  return <div className="error-message-box">{message}</div>;
}

export default ErrorMessage;