import React from "react";
import DashboardProvider from "./Provider";

function DashboardLayout({ children }: any) { 
    return(
        <div>
           <DashboardProvider>{children}</DashboardProvider> 
        </div>
    )
}

export default DashboardLayout;