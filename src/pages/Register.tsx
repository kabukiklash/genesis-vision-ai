import { Navigate } from "react-router-dom";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function Register() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center">Genesis Vision AI</h1>
        <p className="text-gray-600 text-center mb-8">Criar Conta</p>

        <RegisterForm
          onSuccess={() => navigate("/login", { replace: true })}
          onSwitchToLogin={() => navigate("/login", { replace: true })}
        />

        <p className="text-center text-sm text-gray-600 mt-6">
          Já tem conta?{" "}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            Faça login aqui
          </Link>
        </p>
      </div>
    </div>
  );
}
