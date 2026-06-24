import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import Home from "@/pages/Home";
import Collect from "@/pages/Collect";
import Bank from "@/pages/Bank";
import Practice from "@/pages/Practice";
import Techniques from "@/pages/Techniques";
import WrongBook from "@/pages/WrongBook";
import Export from "@/pages/Export";
import SignTool from "@/pages/SignTool";

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 pb-16 lg:pb-0">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/collect" element={<Collect />} />
            <Route path="/bank" element={<Bank />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/techniques" element={<Techniques />} />
            <Route path="/wrongbook" element={<WrongBook />} />
            <Route path="/export" element={<Export />} />
            <Route path="/sign-tool" element={<SignTool />} />
          </Routes>
        </main>
        <Footer />
        <BottomNav />
      </div>
    </Router>
  );
}
