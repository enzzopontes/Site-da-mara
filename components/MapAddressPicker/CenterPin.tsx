import React from "react";

interface CenterPinProps {
  isDragging: boolean;
}

export const CenterPin: React.FC<CenterPinProps> = ({ isDragging }) => {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-full flex flex-col items-center">
      {/* Pino Central */}
      <div
        className={`transition-transform duration-300 ease-out will-change-transform ${
          isDragging ? "-translate-y-4 scale-105" : "translate-y-0 scale-100"
        }`}
      >
        <div className="relative flex flex-col items-center">
          <svg
            width="40"
            height="48"
            viewBox="0 0 40 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-md"
            aria-hidden="true"
          >
            {/* Corpo do Pino */}
            <path
              d="M20 0C8.954 0 0 8.954 0 20C0 32.5 17.5 46.5 19.1 47.76a1.44 1.44 0 001.8 0C22.5 46.5 40 32.5 40 20C40 8.954 31.046 0 20 0Z"
              className="fill-red-600"
            />
            {/* Núcleo Central */}
            <circle cx="20" cy="18" r="7" className="fill-white" />
            <circle cx="20" cy="18" r="4" className="fill-red-600" />
          </svg>
        </div>
      </div>

      {/* Sombra no Solo */}
      <div
        className={`h-2.5 w-6 rounded-full bg-black/60 blur-[1px] transition-all duration-300 ease-out ${
          isDragging
            ? "scale-50 opacity-20 translate-y-1"
            : "scale-100 opacity-60 translate-y-0"
        }`}
      />
    </div>
  );
};
