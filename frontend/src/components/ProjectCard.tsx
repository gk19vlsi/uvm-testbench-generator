/**
 * ProjectCard Component
 * Displays individual project information in a card format
 */

import { Project } from "../types";

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onDelete: () => void;
}

const ProjectCard = ({ project, onClick, onDelete }: ProjectCardProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "generating":
        return "bg-blue-100 text-blue-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getReadinessColor = (score?: number) => {
    if (!score) return "text-gray-400";
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200">
      <div className="p-5 cursor-pointer" onClick={onClick}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 truncate">
            {project.name}
          </h3>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}
          >
            {project.status}
          </span>
        </div>

        {project.description && (
          <p className="mt-2 text-sm text-gray-500 line-clamp-2">
            {project.description}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center">
            <svg
              className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                clipRule="evenodd"
              />
            </svg>
            <span>{formatDate(project.createdAt)}</span>
          </div>

          {project.readinessScore !== undefined && (
            <div className="flex items-center">
              <svg
                className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path
                  fillRule="evenodd"
                  d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className={`font-medium ${getReadinessColor(project.readinessScore)}`}>
                {project.readinessScore}%
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-50 px-5 py-3">
        <div className="flex justify-between items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            Open Project →
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-sm font-medium text-red-600 hover:text-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
