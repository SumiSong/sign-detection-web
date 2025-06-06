import { BrowserRouter, Route, Routes } from "react-router-dom";
import DataCreate from "./DataCreate";
import DataSend from "./DataSend";

const App = () => {
  return (
    <BrowserRouter>
    <Routes>
      <Route path="/" element={<DataCreate/>}/>
      <Route path="/submit" element={<DataSend/>}/>
    </Routes>
    </BrowserRouter>
  );
};

export default App;
