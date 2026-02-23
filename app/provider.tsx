"use client";

import UserDetailContext from "@/context/UserDetailContext";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { set } from "date-fns";
import React, { useEffect, useState } from "react";

function Provider({ children,
}: Readonly<{
    children: React.ReactNode;
}>
) {

    const { user } = useUser();
    const createUser = useMutation(api.user.CreateNewUser);
    const [useDetail, setUserDetail] = useState<{ name: string; email: string; token: number } | undefined>();

    const CreateAndGetUser = async () => {
        if (user) {
            const result = await createUser({
                name: user.fullName || "No Name",
                email: user.emailAddresses[0]?.emailAddress || ''
            });
            console.log("User created or fetched:", result);
            setUserDetail(result);
        }
    };

    useEffect(() => {
        CreateAndGetUser();
    }, [user]);

    return (
        <UserDetailContext.Provider value={{ useDetail, setUserDetail }}>
            <div>{children}</div>
        </UserDetailContext.Provider>
    );
}

export default Provider