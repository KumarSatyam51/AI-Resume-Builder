import {
  FilePenLineIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  UploadCloudIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { dummyResumeData } from "../assets/assets";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const colors = ["#9333ea", "#d97706", "#dc2626", "#0284c7", "#16a34a"];

  const [allResumes, setAllResumes] = useState([]);
  const [showCreateResume, setShowCreateResume] = useState(false);
  const [showUploadResume, setShowUploadResume] = useState(false);
  const [editResumeId, setEditResumeId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [title, setTitle] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    setAllResumes(dummyResumeData);
  }, []);

  /* ---------------- DELETE ---------------- */
  const deleteResume = () => {
    setAllResumes((prev) => prev.filter((r) => r._id !== deleteId));
    setDeleteId(null);
  };

  /* ---------------- EDIT ---------------- */
  const updateTitle = (e) => {
    e.preventDefault();
    setAllResumes((prev) =>
      prev.map((r) =>
        r._id === editResumeId ? { ...r, title } : r
      )
    );
    setEditResumeId(null);
    setTitle("");
  };

  /* ---------------- DRAG & DROP ---------------- */
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) {
      setResumeFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <p className="text-2xl font-medium mb-6 text-slate-700">
        Welcome, Joe Doe
      </p>

      {/* CREATE / UPLOAD */}
      <div className="grid grid-cols-2 sm:flex gap-4">
        <Card onClick={() => setShowCreateResume(true)}>
          <PlusIcon className="size-7 text-indigo-600" />
          <p className="text-indigo-600">Create Resume</p>
        </Card>

        <Card onClick={() => setShowUploadResume(true)} purple>
          <UploadCloudIcon className="size-7 text-purple-600" />
          <p className="text-purple-600">Upload Existing</p>
        </Card>
      </div>

      {/* GRADIENT DIVIDER */}
      <div className="my-8 h-px w-full max-w-md bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

      {/* RESUME LIST */}
      <div className="grid grid-cols-2 sm:flex flex-wrap gap-4">
        {allResumes.map((resume, index) => {
          const baseColor = colors[index % colors.length];
          return (
            <button
              key={resume._id}
              onClick={() => navigate(`/app/builder/${resume._id}`)}
              className="relative w-full sm:max-w-36 h-48 rounded-lg border flex flex-col items-center justify-center gap-2 group"
              style={{
                background: `linear-gradient(135deg, ${baseColor}10, ${baseColor}40)`,
                borderColor: baseColor + "40",
              }}
            >
              <FilePenLineIcon style={{ color: baseColor }} />
              <p style={{ color: baseColor }}>{resume.title}</p>

              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-1 right-1 hidden group-hover:flex"
              >
                <TrashIcon
                  onClick={() => setDeleteId(resume._id)}
                  className="size-7 p-1 hover:bg-white/50 rounded"
                />
                <PencilIcon
                  onClick={() => {
                    setEditResumeId(resume._id);
                    setTitle(resume.title);
                  }}
                  className="size-7 p-1 hover:bg-white/50 rounded"
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* ---------------- CREATE MODAL ---------------- */}
      {showCreateResume && (
        <Modal close={() => setShowCreateResume(false)} title="Create Resume">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim()) return;

              const newId = crypto.randomUUID();

              setAllResumes((prev) => [
                { _id: newId, title },
                ...prev,
              ]);

              setShowCreateResume(false);
              setTitle("");
              navigate(`/app/builder/${newId}`);
            }}
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter resume title"
              className="w-full border px-4 py-2 rounded mb-4"
              required
            />

            <button className="w-full bg-green-600 text-white py-2 rounded">
              Continue
            </button>
          </form>
        </Modal>
      )}

      {/* ---------------- UPLOAD MODAL ---------------- */}
      {showUploadResume && (
        <Modal close={() => setShowUploadResume(false)} title="Upload Resume">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!resumeFile) return;

              setShowUploadResume(false);
              setResumeFile(null);
              setTitle("");
            }}
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resume title"
              className="w-full border px-4 py-2 rounded mb-4"
              required
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("fileInput").click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                isDragging
                  ? "border-green-500 bg-green-50"
                  : "border-slate-300"
              }`}
            >
              {resumeFile ? (
                <p className="text-green-700 font-medium">
                  {resumeFile.name}
                </p>
              ) : (
                <>
                  <UploadCloudIcon className="mx-auto size-12 text-slate-400" />
                  <p className="text-slate-500">
                    Drag & drop or click to upload
                  </p>
                </>
              )}
            </div>

            <input
              id="fileInput"
              type="file"
              hidden
              accept=".pdf,.doc,.docx"
              onChange={(e) => setResumeFile(e.target.files[0])}
            />

            <button
              disabled={!resumeFile}
              className="w-full mt-4 bg-green-600 text-white py-2 rounded disabled:bg-gray-400"
            >
              Upload Resume
            </button>
          </form>
        </Modal>
      )}

      {/* ---------------- EDIT MODAL ---------------- */}
      {editResumeId && (
        <Modal close={() => setEditResumeId(null)} title="Edit Resume Title">
          <form onSubmit={updateTitle}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border px-4 py-2 rounded mb-4"
              required
            />
            <button className="w-full bg-green-600 text-white py-2 rounded">
              Update
            </button>
          </form>
        </Modal>
      )}

      {/* ---------------- DELETE MODAL ---------------- */}
      {deleteId && (
        <Modal close={() => setDeleteId(null)} title="Delete Resume">
          <p className="mb-4">Are you sure you want to delete this resume?</p>
          <div className="flex gap-2">
            <button
              onClick={deleteResume}
              className="flex-1 bg-red-600 text-white py-2 rounded"
            >
              Delete
            </button>
            <button
              onClick={() => setDeleteId(null)}
              className="flex-1 border py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

/* ---------- REUSABLE COMPONENTS ---------- */

const Card = ({ children, onClick, purple }) => (
  <button
    onClick={onClick}
    className="w-full sm:max-w-36 h-48 border rounded-lg flex flex-col items-center justify-center gap-2 hover:shadow-lg"
    style={{
      background: purple
        ? "linear-gradient(135deg,#a855f710,#a855f740)"
        : "linear-gradient(135deg,#6366f110,#6366f140)",
    }}
  >
    {children}
  </button>
);

const Modal = ({ children, title, close }) => (
  <div
    onClick={close}
    className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="bg-white rounded-lg w-full max-w-sm p-6 relative"
    >
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <XIcon
        onClick={close}
        className="absolute top-4 right-4 cursor-pointer"
      />
      {children}
    </div>
  </div>
);

export default Dashboard;
