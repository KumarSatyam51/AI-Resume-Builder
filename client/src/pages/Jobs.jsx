import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../configs/api";
import toast from "react-hot-toast";

const Jobs = () => {
  const { resumeId } = useParams();
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchText, setSearchText] = useState("");

  const hasFetchedRef = useRef(false);

  const loadJobs = useCallback(async () => {
    if (!resumeId) return;

    if (!token) {
      toast.error("Please login first");
      navigate("/login");
      return;
    }

    try {
      setLoading(true);

      const { data } = await api.get(`/api/jobs/ai-match/${resumeId}`, {
        headers: {
          Authorization: token,
        },
        params: {
          t: Date.now(), // prevent cache / 304
        },
      });

      setJobs(Array.isArray(data?.jobs) ? data.jobs : []);
      setAiData(data?.ai || null);
      setQuery(data?.query || "");
      setSelectedIndex(0);
    } catch (error) {
      console.log("Jobs API Error:", error);
      console.log("Backend Error:", error?.response?.data);

      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to fetch jobs"
      );
    } finally {
      setLoading(false);
    }
  }, [resumeId, token, navigate]);

  useEffect(() => {
    if (!resumeId || !token) return;

    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    loadJobs();
  }, [resumeId, token, loadJobs]);

  const handleRefresh = async () => {
    await loadJobs();
  };

  const filteredJobs = useMemo(() => {
    if (!searchText.trim()) return jobs;

    const text = searchText.toLowerCase();

    return jobs.filter((job) => {
      const title = job?.title?.toLowerCase() || "";
      const company = job?.company_name?.toLowerCase() || "";
      const location = job?.location?.toLowerCase() || "";
      const description = job?.description?.toLowerCase() || "";

      return (
        title.includes(text) ||
        company.includes(text) ||
        location.includes(text) ||
        description.includes(text)
      );
    });
  }, [jobs, searchText]);

  const selectedJob = filteredJobs[selectedIndex] || null;

  useEffect(() => {
    if (selectedIndex >= filteredJobs.length) {
      setSelectedIndex(0);
    }
  }, [filteredJobs.length, selectedIndex]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
              AI Matched Jobs
            </h1>

            {query && (
              <p className="text-sm text-slate-500 mt-1">
                Search query:{" "}
                <span className="font-medium text-slate-700">{query}</span>
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Loading..." : "Refresh Jobs"}
            </button>

            <button
              onClick={() => navigate("/app")}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-white transition"
            >
              Back
            </button>
          </div>
        </div>

        {aiData && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              AI Analysis
            </h2>

            <p className="text-sm text-slate-700 mb-3">
              <span className="font-semibold">Suggested role:</span>{" "}
              {aiData?.jobTitle || "Not available"}
            </p>

            {Array.isArray(aiData?.keywords) && aiData.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {aiData.keywords.map((keyword, index) => (
                  <span
                    key={`${keyword}-${index}`}
                    className="px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700 border border-blue-100"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6">
          <input
            type="text"
            placeholder="Search jobs, company, location..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <p className="text-slate-600">Loading jobs...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <p className="text-slate-600">No matching jobs found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 xl:col-span-4">
              <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                {filteredJobs.map((job, index) => {
                  const active = index === selectedIndex;

                  return (
                    <button
                      key={job?.job_id || job?.title || index}
                      onClick={() => setSelectedIndex(index)}
                      className={`w-full text-left border rounded-xl p-4 transition shadow-sm ${
                        active
                          ? "border-blue-600 bg-blue-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {job?.thumbnail ? (
                          <img
                            src={job.thumbnail}
                            alt={job?.company_name || "Company"}
                            className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg border border-slate-200 flex items-center justify-center text-xs text-slate-400 bg-slate-50">
                            Logo
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-slate-800 line-clamp-2">
                            {job?.title || "Untitled Job"}
                          </h3>

                          <p className="text-sm text-slate-700 mt-1 line-clamp-1">
                            {job?.company_name || "Unknown Company"}
                          </p>

                          <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                            {job?.location || "Location not specified"}
                          </p>

                          {Array.isArray(job?.extensions) &&
                            job.extensions.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {job.extensions.slice(0, 3).map((item, i) => (
                                  <span
                                    key={`${item}-${i}`}
                                    className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-700"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-7 xl:col-span-8">
              {selectedJob ? (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm sticky top-4">
                  <div className="flex items-start gap-4">
                    {selectedJob?.thumbnail ? (
                      <img
                        src={selectedJob.thumbnail}
                        alt={selectedJob?.company_name || "Company"}
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl border border-slate-200 flex items-center justify-center text-sm text-slate-400 bg-slate-50">
                        Logo
                      </div>
                    )}

                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-slate-800">
                        {selectedJob?.title || "Untitled Job"}
                      </h2>

                      <p className="text-slate-700 mt-2 font-medium">
                        {selectedJob?.company_name || "Unknown Company"}
                      </p>

                      <p className="text-slate-500 mt-1">
                        {selectedJob?.location || "Location not specified"}
                      </p>

                      {Array.isArray(selectedJob?.extensions) &&
                        selectedJob.extensions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-4">
                            {selectedJob.extensions.map((item, i) => (
                              <span
                                key={`${item}-${i}`}
                                className="px-3 py-1 text-sm rounded-full bg-slate-100 text-slate-700"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-6">
                    {selectedJob?.share_link && (
                      <a
                        href={selectedJob.share_link}
                        target="_blank"
                        rel="noreferrer"
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        View Job
                      </a>
                    )}

                    {selectedJob?.related_links?.[0]?.link && (
                      <a
                        href={selectedJob.related_links[0].link}
                        target="_blank"
                        rel="noreferrer"
                        className="px-5 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                      >
                        Apply Now
                      </a>
                    )}
                  </div>

                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-slate-800 mb-3">
                      Job Description
                    </h3>

                    <div className="text-slate-600 leading-7 whitespace-pre-line">
                      {selectedJob?.description || "No description available."}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <p className="text-slate-600">
                    Select a job to view details.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Jobs;