import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectContent
} from '@/components/ui/select';

type Instrument = {
  instrument_type: string;
  full_name: string;
};

type LifeCycleStage = {
  lifecycle_stage: string;
  display_name: string;
};

type InstrumentLifeCycleProps = {
  instrument: string;
  lifecycle: string;
  errors: {
    instrument?: string;
    lifecycle?: string;
  };
  onSelection: (instrument: string, lifecycle: string) => void;
};

const InstrumentLifeCycle = ({
  instrument,
  lifecycle,
  onSelection,
  errors
}: InstrumentLifeCycleProps) => {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [lifeCycles, setLifeCycles] = useState<LifeCycleStage[]>([]);

  // Load Instruments
  const loadInstruments = async () => {
    const res = await fetch('/api/lc/instruments');
    const data = await res.json();

    setInstruments(Array.isArray(data) ? data : []);
  };
  const loadLifeCycles = async () => {
    const res = await fetch('/api/lc/lifecycle-stages');
    const data = await res.json();

    setLifeCycles(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadInstruments();
    loadLifeCycles();
  }, []);

  return (
    <div className="card pb-2.5">
      <div className="card-header p-2" id="InstrumentLifeCycle">
        <h3 className="card-title text-md md:text-lg">Instrument and LifeCycle</h3>
      </div>
      <div className="md:card-body p-2 grid gap-5">
        <div className="w-full">
         <div className="flex items-baseline flex-wrap lg:flex-nowrap">
            {/* LABEL */}
            <label className="form-label max-w-40 text-sm md:text-md">
              Instrument:<span className="text-danger text-xl">*</span>
            </label>

            {/* INPUT + ERROR (STACKED) */}
            <div className="flex flex-col w-full">
              <Select value={instrument} onValueChange={(val) => onSelection(val, lifecycle)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Instrument" />
                </SelectTrigger>

                <SelectContent>
                  {instruments.map((inst) => (
                    <SelectItem key={inst.instrument_type} value={inst.instrument_type}>
                      {inst.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {errors.instrument && <p className="text-danger text-xs mt-1">{errors.instrument}</p>}
            </div>
          </div>
        </div>
        <div className="w-full">
            <div className="flex items-baseline flex-wrap lg:flex-nowrap ">
            {/* LABEL */}
            <label className="form-label max-w-40 text-sm md:text-md">
              Life Cycle:<span className="text-danger text-xl">*</span>
            </label>

            {/* INPUT + ERROR (STACKED) */}
            <div className="flex flex-col w-full">
              <Select value={lifecycle} onValueChange={(val) => onSelection(instrument, val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Life Cycle" />
                </SelectTrigger>

                <SelectContent>
                  {lifeCycles.map((item) => (
                    <SelectItem key={item.lifecycle_stage} value={item.lifecycle_stage}>
                      {item.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {errors.lifecycle && <p className="text-danger text-xs mt-1">{errors.lifecycle}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstrumentLifeCycle;
