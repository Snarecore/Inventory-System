import { Link } from "react-router-dom";

const Footer = () => {
    return (
        <div className='flex items-center flex-wrap justify-center gap-1.5 sm:gap-4 sm:justify-between bg-white border-t border-gray-200 p-3'>
            <p className="text-[13px] text-[#212B36]">2026 &#169; All rights reserved by The Cashboi</p>
            <p className="text-sm text-[#646B72]">Designed & Developed By {""}
                <Link to={"#"}>
                    <span className="text-[var(--color-primary)]">WEBNS Technology</span>
                </Link>
            </p>
        </div>
    );
};

export default Footer;