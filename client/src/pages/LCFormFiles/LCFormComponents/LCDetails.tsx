import React from 'react';
interface LCDetailsProps {
  lcNumber: string;
  onChangeLCNumber: (value: string) => void;
  errors:any
}
const LCDetails: React.FC<LCDetailsProps> = ({ lcNumber, onChangeLCNumber ,errors}) => {
  return (
    <div className="card pb-2.5">
      <div className="card-header p-2" id="LCDetails">
        <h3 className="card-title text-md md:text-lg">LC Details</h3>
      </div>
      <div className="md:card-body p-2 grid gap-5">
        <div className="w-full">
          <div className="flex items-baseline flex-wrap lg:flex-nowrap">
            <label className="form-label flex items-center gap-1 max-w-40 text-sm md:text-md">
              LC/LG Number:<span className="text-danger text-xl">*</span>
            </label>
            <input
              className="input"
              type="text"
              placeholder="Enter LC/LG Number"
              value={lcNumber}
              onChange={(e) => onChangeLCNumber(e.target.value)}
            />
          </div>
          <div className="flex items-baseline flex-wrap lg:flex-nowrap">
            <label className="form-label flex items-center gap-1 max-w-40 text-sm md:text-md"></label>
            {errors.lcNumber && <p className="text-danger text-xs mt-1">{errors.lcNumber}</p>}
          </div>
        </div>

        <div className="w-full">
          <div className="flex items-baseline flex-wrap lg:flex-nowrap">
            <label className="form-label flex items-center gap-1 max-w-40 text-sm md:text-md">
              Transaction No:
            </label>
            <input className="input" type="text" placeholder="Generated automatically" disabled />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LCDetails;
