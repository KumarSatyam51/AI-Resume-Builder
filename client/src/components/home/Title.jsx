import React from "react";

 const Title = ({title, description }) =>{
    return(
        <div className="text-center mt-6 text-white">
            <h2 className="text-3xl sm:text-4xl font-mediuk">{title}</h2>
            <p className="max-sm max-w-2xl mt-4 text-white">{description}</p>

        </div>
    )
 }

 export default Title;