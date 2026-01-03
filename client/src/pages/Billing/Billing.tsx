import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DataTable, { Column } from '../FrameworkComponent/DataTable';
import { useQuery } from '@tanstack/react-query';
/* ---------------- TYPES ---------------- */

type BillingRow = {
  id: number;
  transaction_no: string;
  cifid: string;
  module: string;
  instrument_type: string;
  lifecycle: string;
  lc_number: string;
  variation: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
  userid: number;
  request_tokens: number;
  response_tokens: number;
};

type LLMRequestRow = {
  request_id: number;
  transaction_id: string;
  request_payload: string;
  token_count: number;
  created_at: string;
  prompt_id: number;
  Rag: string;
  cifno: string;
  lc_number: string;
  UserID: number;
  Model: string;
};
type LLMResponseRow = {
  response_id: number;
  transaction_id: string;
  request_id: number;
  response_payload: string;
  token_count: number;
  created_at: string;
  Rag: string;
  cifno: string;
  lc_number: string;
  UserID: number;
  Model: string;
};

type TabType = 'billing' | 'requests' | 'responses';
/* ---------------- COMPONENT ---------------- */

const Billing = () => {
  const [activeTab, setActiveTab] = useState<TabType>('billing');
  const [searchText, setSearchText] = useState('');

  const { data: billingData = [] } = useQuery({
    queryKey: ['/api/lc/billing'],
    queryFn: async () => {
      const response = await fetch('/api/lc/billing');

      if (!response.ok) {
        throw new Error('Failed to fetch billing data');
      }

      const data = await response.json();

      //  HARD SAFETY CHECK (same logic you had)
      if (Array.isArray(data)) {
        return data;
      }

      if (Array.isArray(data?.data)) {
        return data.data;
      }

      console.error('Unexpected API format', data);
      return [];
    }
  });
  const { data: data = [] } = useQuery({
    queryKey: ['/api/lc/llm-requests'],
    queryFn: async () => {
      const response = await fetch('/api/lc/llm-requests');

      if (!response.ok) {
        throw new Error('Failed to fetch billing data');
      }

      const data = await response.json();

      //  HARD SAFETY CHECK (same logic you had)
      if (Array.isArray(data)) {
        return data;
      }

      if (Array.isArray(data?.data)) {
        return data.data;
      }

      console.error('Unexpected API format', data);
      return [];
    }
  });
  const { data: responseData = [] } = useQuery({
    queryKey: ['/api/lc/llm-responses"'],
    queryFn: async () => {
      const response = await fetch('/api/lc/llm-responses');

      if (!response.ok) {
        throw new Error('Failed to fetch billing data');
      }

      const data = await response.json();

      //  HARD SAFETY CHECK (same logic you had)
      if (Array.isArray(data)) {
        return data;
      }

      if (Array.isArray(data?.data)) {
        return data.data;
      }

      console.error('Unexpected API format', data);
      return [];
    }
  });
  console.log('reponse', responseData);

  const billingColumns: Column<BillingRow>[] = [
    { key: 'id', label: 'ID' },
    { key: 'transaction_no', label: 'Transaction No' },
    { key: 'cifid', label: 'CIF ID' },
    { key: 'module', label: 'Module' },
    { key: 'instrument_type', label: 'Instrument Type' },
    { key: 'lifecycle', label: 'Lifecycle' },
    { key: 'lc_number', label: 'LC Number' },
    { key: 'variation', label: 'Variation' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span
          className={`px-2 py-1 text-white rounded-full ${row.status ? 'bg-success' : 'bg-danger'}`}
        >
          {row.status ? 'active' : 'Inactive'}
        </span>
      )
    },

    { key: 'request_tokens', label: 'Request Tokens' },
    { key: 'response_tokens', label: 'Response Tokens' },
    { key: 'userid', label: 'User ID' },
    {
      key: 'created_at',
      label: 'Created At',
      render: (row) => new Date(row.created_at).toLocaleString()
    },
    {
      key: 'updated_at',
      label: 'Updated At',
      render: (row) => (row.updated_at ? new Date(row.updated_at).toLocaleString() : '-')
    }
  ];
  const columns: Column<LLMRequestRow>[] = [
    { key: 'request_id', label: 'Request ID' },
    { key: 'transaction_id', label: 'Transaction ID' },
    {
      key: 'request_payload',
      label: 'Request Payload',
      render: (row) => (
        <div className="max-w-md truncate" title={row.request_payload}>
          {row.request_payload}
        </div>
      )
    },
    { key: 'token_count', label: 'Token Count' },
    { key: 'prompt_id', label: 'Prompt ID' },
    { key: 'Rag', label: 'RAG Type' },
    { key: 'cifno', label: 'CIF No' },
    { key: 'lc_number', label: 'LC Number' },
    { key: 'UserID', label: 'User ID' },
    { key: 'Model', label: 'Model' },
    {
      key: 'created_at',
      label: 'Created At',
      render: (row) => new Date(row.created_at).toLocaleString()
    }
  ];

  const responseColumns: Column<LLMResponseRow>[] = [
    { key: 'response_id', label: 'Response ID' },
    { key: 'transaction_id', label: 'Transaction ID' },
    { key: 'request_id', label: 'Request ID' },
    {
      key: 'response_payload',
      label: 'Response Payload',
      render: (row) => (
        <div className="max-w-md truncate" title={row.response_payload}>
          {row.response_payload}
        </div>
      )
    },
    { key: 'token_count', label: 'Token Count' },
    { key: 'Rag', label: 'RAG Type' },
    { key: 'cifno', label: 'CIF No' },
    { key: 'lc_number', label: 'LC Number' },
    { key: 'UserID', label: 'User ID' },
    { key: 'Model', label: 'Model' },
    {
      key: 'created_at',
      label: 'Created At',
      render: (row) => new Date(row.created_at).toLocaleString()
    }
  ];
  const filterData = <T extends Record<string, any>>(rows: T[]) => {
    if (!searchText.trim()) return rows;

    const keyword = searchText.toLowerCase();

    return rows.filter((row) =>
      Object.values(row).some(
        (value) =>
          value !== null && value !== undefined && value.toString().toLowerCase().includes(keyword)
      )
    );
  };

  return (
    <div className="w-full p-6 space-y-3 card">
      <div className="tabs flex gap-3">
        <button
          onClick={() => setActiveTab('billing')}
          className={`tab px-4 py-2 text-md md:text-xl font-bold ${activeTab === 'billing' ? 'active' : ''}`}
        >
          Billing
        </button>

        <button
          onClick={() => {
            setActiveTab('requests');
          }}
          className={`tab px-4 py-2 text-md md:text-xl font-bold ${activeTab === 'requests' ? 'active' : ''}`}
        >
          LLM Requests
        </button>

        <button
          onClick={() => {
            setActiveTab('responses');
          }}
          className={`tab px-4 py-2 text-md md:text-xl font-bold ${activeTab === 'responses' ? 'active' : ''}`}
        >
          LLM Responses
        </button>
      </div>
      <div className="flex justify-end">
        <div className="input input-md w-full sm:w-48 2xl:w-60 border hover:border-blue-400 border-primary text-md flex items-center gap-2">
          <i className="ki-filled ki-magnifier"></i>
          <input
            className="w-full "
            placeholder="Search........."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {activeTab === 'billing' && (
        <div className="grid">
          <div className="card min-w-full">
            <div className="card-table scrollable-x-auto">
              <DataTable
                data={filterData(Array.isArray(billingData) ? billingData : [])}
                columns={billingColumns}
                rowKey={(row) => row.id}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="grid">
          <div className="card min-w-full">
            <div className="card-table scrollable-x-auto">
              <DataTable
                data={filterData(Array.isArray(data) ? data : [])}
                columns={columns}
                rowKey={(row) => row.request_id}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'responses' && (
        <div className="grid">
          <div className="card min-w-full">
            <div className="card-table scrollable-x-auto">
              <DataTable
                data={filterData(Array.isArray(responseData) ? responseData : [])}
                columns={responseColumns}
                rowKey={(row) => row.response_id}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
