// src/components/common/Loader.jsx
function Loader({ message = "Loading..." }) {
  return (
    <div className="loader-wrapper">
      <div className="spinner" />
      <p>{message}</p>
    </div>
  );
}

export default Loader;