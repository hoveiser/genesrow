import ContractStatus from "../components/ContractStatus";
import SecurityDashboard from "../components/SecurityDashboard";

export default function Security() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Security &amp; verification</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          The six v1.3.0 hardening items, the on-chain gateway reachability probe, and the
          finalized StudioNet transactions behind every claim.
        </p>
      </div>
      <SecurityDashboard />
      <ContractStatus />
    </div>
  );
}
