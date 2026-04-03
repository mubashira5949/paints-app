import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import {
  ArrowLeft,
  AlertCircle,
  FlaskConical,
  CheckCircle2,
  ChevronRight,
  Loader2,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Color {
  id: number;
  name: string;
  business_code: string;
  product_type?: string;
  available_lcs?: boolean;
  available_std?: boolean;
  available_opq_js?: boolean;
}

interface Formula {
  id: number;
  name: string;
  batch_size_kg: number;
}

interface Operator {
  id: number;
  username: string;
  role: string;
}

interface ExpectedResource {
  resource_id: number;
  name: string;
  unit: string;
  expected_quantity: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProductionRunForm() {
  const navigate = useNavigate();

  // Form options
  const [colors, setColors] = useState<Color[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);

  // Form values
  const [selectedColor, setSelectedColor] = useState<number | "">("");
  const [selectedInkSeries, setSelectedInkSeries] = useState<string>("");
  const [selectedFormula, setSelectedFormula] = useState<number | "">("");
  const [targetQty, setTargetQty] = useState<string>("");
  const [selectedOperator, setSelectedOperator] = useState<number | "">("");

  // Result state
  const [expectedResources, setExpectedResources] = useState<ExpectedResource[]>([]);
  const [successRunId, setSuccessRunId] = useState<number | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFormulas, setIsLoadingFormulas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch colors + operators on mount ──
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [colorsData, usersData] = await Promise.all([
          apiRequest<Color[]>("/colors"),
          apiRequest<Operator[]>("/users"),
        ]);
        setColors(colorsData);
        // Filter to operator/manager roles only
        setOperators(
          usersData.filter((u) =>
            ["operator", "manager", "admin"].includes(u.role)
          )
        );
      } catch (err) {
        setError("Failed to load form data. Please refresh and try again.");
      }
    };
    fetchInitialData();
  }, []);

  // ── Fetch formulas when color changes ──
  useEffect(() => {
    if (!selectedColor) {
      setFormulas([]);
      setSelectedFormula("");
      return;
    }
    const fetchFormulas = async () => {
      setIsLoadingFormulas(true);
      try {
        const formulasData = await apiRequest<Formula[]>(`/formulas/${selectedColor}`);
        setFormulas(formulasData);
      } catch {
        setFormulas([]);
      } finally {
        setIsLoadingFormulas(false);
      }
    };
    fetchFormulas();
  }, [selectedColor]);

  // ── Handle form submission ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedColor || !selectedFormula || !targetQty || !selectedOperator) {
      setError("Please fill in all fields before submitting.");
      return;
    }
    if (Number(targetQty) <= 0) {
      setError("Target quantity must be greater than 0.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiRequest<{
        production_run_id: number;
        status: string;
        expected_resources: ExpectedResource[];
      }>("/production-runs/plan", {
        method: "POST",
        body: {
          formulaId: Number(selectedFormula),
          colorId: Number(selectedColor),
          targetQty: Number(targetQty),
          operatorId: Number(selectedOperator),
          inkSeries: selectedInkSeries || null,
        },
      });

      setExpectedResources(result.expected_resources || []);
      setSuccessRunId(result.production_run_id);
    } catch (err: any) {
      setError(err.message || "Failed to create production batch. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success screen ──
  if (successRunId !== null) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Success Banner */}
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6 flex items-start gap-4">
          <CheckCircle2 className="w-8 h-8 text-green-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg font-bold text-green-800">
              Batch Planned Successfully!
            </h2>
            <p className="text-sm text-green-700 mt-1">
              Production run{" "}
              <span className="font-bold">#{successRunId}</span> has been
              created with status{" "}
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">
                Planned
              </span>
            </p>
          </div>
        </div>

        {/* Expected Resources */}
        {expectedResources.length > 0 && (
          <div className="rounded-xl border bg-white shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-blue-600" />
              Expected Material Requirements
            </h3>
            <div className="divide-y rounded-lg border overflow-hidden">
              {expectedResources.map((res) => (
                <div
                  key={res.resource_id}
                  className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors"
                >
                  <span className="font-medium text-slate-800">{res.name}</span>
                  <span className="text-sm font-bold text-blue-700">
                    {Number(res.expected_quantity).toFixed(2)}{" "}
                    <span className="text-slate-500 font-normal">{res.unit}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/production")}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-sm"
          >
            View Production Runs
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSuccessRunId(null);
              setSelectedColor("");
              setSelectedInkSeries("");
              setSelectedFormula("");
              setTargetQty("");
              setSelectedOperator("");
              setExpectedResources([]);
            }}
            className="px-6 py-3 border rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Start Another
          </button>
        </div>
      </div>
    );
  }

  // ── Form screen ──
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 border rounded-xl hover:bg-slate-50 text-slate-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Start New Production Batch
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Plan a new batch — status will be set to <strong>Planned</strong>.
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border shadow-sm p-6 space-y-6"
      >
        {/* Row 1: Color + Formula */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Select Color */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Select Color <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedColor}
              onChange={(e) => {
                const colorId = e.target.value ? Number(e.target.value) : "";
                setSelectedColor(colorId);
                setSelectedInkSeries("");
                setSelectedFormula("");
              }}
              required
              className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm transition-shadow"
            >
              <option value="">— Select Color —</option>
              {colors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.business_code}) {c.product_type ? `[${c.product_type}]` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Select Formula */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Select Formula <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedFormula}
                onChange={(e) =>
                  setSelectedFormula(e.target.value ? Number(e.target.value) : "")
                }
                disabled={!selectedColor || isLoadingFormulas}
                required
                className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">
                  {isLoadingFormulas
                    ? "Loading formulas..."
                    : selectedColor
                    ? "— Select Formula —"
                    : "— Select a color first —"}
                </option>
                {formulas.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} (batch: {r.batch_size_kg}kg)
                  </option>
                ))}
              </select>
              {isLoadingFormulas && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400 pointer-events-none" />
              )}
            </div>
            {selectedColor && !isLoadingFormulas && formulas.length === 0 && (
              <p className="text-xs text-amber-600">
                No formulas found for this color.
              </p>
            )}
          </div>

          {/* Ink Series Selection */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Ink Series (Grade) <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedInkSeries}
              onChange={(e) => setSelectedInkSeries(e.target.value)}
              disabled={!selectedColor}
              required
              className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">— Select Series —</option>
              {selectedColor &&
                colors.find((c) => c.id === selectedColor)?.available_lcs && (
                  <option value="LCS">LCS (Low Crocking Series)</option>
                )}
              {selectedColor &&
                colors.find((c) => c.id === selectedColor)?.available_std && (
                  <option value="STD">STD (Standard Series)</option>
                )}
              {selectedColor &&
                colors.find((c) => c.id === selectedColor)?.available_opq_js && (
                  <option value="JS">JS / OPQ (Opacity Series)</option>
                )}
            </select>
            {!selectedColor && (
              <p className="text-xs text-slate-400">Select a color to see available series.</p>
            )}
          </div>
        </div>

        {/* Row 2: Target Quantity + Operator */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Target Quantity */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Target Quantity (kg) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={targetQty}
              onChange={(e) => setTargetQty(e.target.value)}
              placeholder="e.g. 100"
              required
              className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-shadow"
            />
            {selectedFormula && formulas.length > 0 && (
              <p className="text-xs text-slate-500">
                Standard batch size:{" "}
                <strong>
                  {formulas.find((r) => r.id === Number(selectedFormula))
                    ?.batch_size_kg ?? "—"}
                  kg
                </strong>
              </p>
            )}
          </div>

          {/* Operator */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Operator <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedOperator}
              onChange={(e) =>
                setSelectedOperator(e.target.value ? Number(e.target.value) : "")
              }
              required
              className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm transition-shadow"
            >
              <option value="">— Select Operator —</option>
              {operators.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.username} ({op.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Hint */}
        <p className="text-xs text-slate-400 border-t pt-4">
          Expected material requirements will be calculated automatically from
          the selected formula and shown after submission.
        </p>

        {/* Submit */}
        <button
          type="submit"
          disabled={
            isLoading ||
            !selectedColor ||
            !selectedInkSeries ||
            !selectedFormula ||
            !targetQty ||
            !selectedOperator
          }
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Planning Batch...
            </>
          ) : (
            <>
              <FlaskConical className="w-5 h-5" />
              Start Batch
            </>
          )}
        </button>
      </form>
    </div>
  );
}
