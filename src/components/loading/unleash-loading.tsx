'use client'
import React from "react";
import dynamic from "next/dynamic";
// import animationData from '@/public/unleash-loading-logo.json';
import lightAnimdata from './unleash-loading-light.json';



// Dynamically import Lottie (client-side only)
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

const UnleashLoading = () => {
    // const { theme, setTheme, systemTheme } = useTheme();

    // const [isClient, setIsClient] = useState(false);

    // useEffect(() => {
    //     setIsClient(true);
    // }, []);

    // if (!isClient) {
    //     return <>Loading...</>
    // }
    return (
        <>
            {/* <div className=""> */}
            <div className="h-dvh flex justify-center">
                <Lottie animationData={lightAnimdata} loop={true} className="w-48" />
            </div>
            {/* </div> */}
        </>
    );
};

export default UnleashLoading
