import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Customers from "@/pages/Customers";
import Cases from "@/pages/Cases";
import Invoices from "@/pages/Invoices";
import Receipts from "@/pages/Receipts";
import Inventory from "@/pages/Inventory";
import Cashbox from "@/pages/Cashbox";
import Expenses from "@/pages/Expenses";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/customers" component={Customers} />
        <Route path="/cases" component={Cases} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/receipts" component={Receipts} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/cashbox" component={Cashbox} />
        <Route path="/expenses" component={Expenses} />
        <Route path="/reports" component={Reports} />
        <Route path="/settings" component={Settings} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
        <Router />
      </WouterRouter>
      <Toaster richColors position="top-left" />
    </QueryClientProvider>
  );
}

export default App;
