import React from "react";
import Banner from "../components/home/Banner";
import Hero from "../components/home/Hero";
import Features from "../components/home/Features";
import Testimonial from "../components/home/Testimonial";
import CallToAcation from "../components/home/CallToAcation";
import Footer from "../components/home/Footer";

const Home = () => {
  return (
    <div className="bg-black text-gray-800">

      {/* 🔹 Top Banner */}
      <div className="w-full">
        <Banner />
      </div>

      {/* 🔹 Hero Section */}
      <section className="py-16 px-4 md:px-10 lg:px-20 bg-black">
        <Hero />
      </section>

      {/* 🔹 Features */}
      <section className="py-16 px-4 md:px-10 lg:px-20 bg-black">
        <Features />
      </section>

      {/* 🔹 Testimonials */}
      <section className="py-16 px-4 md:px-10 lg:px-20 bg-black">
        <Testimonial />
      </section>

      {/* 🔹 Call To Action */}
    <section className="py-20 px-4 md:px-10 lg:px-20  text-white text-center rounded-t-3xl">
        <CallToAcation />
      </section>

      {/* 🔹 Footer */}
      <Footer />
    </div>
  );
};

export default Home;