import React from "react";
import Slider from "react-slick";

const TestimonialData = [
  {
    id: 1,
    name: "Victor",
    text: "Absolutely love the quality and craftsmanship of these handcrafted products! Each piece is unique and beautifully made",
    img: "https://picsum.photos/101/101",
  },
  {
    id: 2,
    name: "Satya Nadella",
    text: "Fast delivery and amazing customer service. The handcrafted jewelry is stunning!",
    img: "https://picsum.photos/102/102",
  },
  {
    id: 3,
    name: "Virat Kohli",
    text: "I'm in awe of the detail and care put into these handmade items. Highly recommended!",
    img: "https://picsum.photos/104/104",
  },
  {
    id: 4, // Fixed missing sequential ID
    name: "Sachin Tendulkar",
    text: "The handcrafted clothing is simply exquisite! The fabric quality and attention to detail are outstanding.",
    img: "https://picsum.photos/103/103",
  },
];

const Testimonials = () => {
  var settings = {
    dots: true,
    arrows: false,
    infinite: true,
    speed: 500,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
    cssEase: "linear",
    pauseOnHover: true,
    pauseOnFocus: true,
    responsive: [
      {
        breakpoint: 10000,
        settings: { slidesToShow: 3, slidesToScroll: 1, infinite: true },
      },
      {
        breakpoint: 1024,
        settings: { slidesToShow: 2, slidesToScroll: 1, initialSlide: 2 },
      },
      {
        breakpoint: 640,
        settings: { slidesToShow: 1, slidesToScroll: 1 },
      },
    ],
  };

  return (
    <div className="py-10 mb-10">
      <div className="container">
        {/* Header Section */}
        <div className="text-center mb-10 max-w-[600px] mx-auto">
          <p data-aos="fade-up" className="text-sm text-primary">
            What our customers are saying
          </p>
          <h1 data-aos="fade-up" className="text-3xl font-bold">Testimonials</h1>
          <p data-aos="fade-up" className="text-xs text-gray-400">
          Experience the beauty of handcrafted excellence. Every piece is crafted with passion, precision, and authenticity
          </p>
        </div>

        {/* Testimonial Cards */}
        <div data-aos="zoom-in">
          <Slider {...settings}>
            {TestimonialData.map((data) => (
              <div key={data.id} className="my-6">
                <div className="flex flex-col gap-4 shadow-lg py-8 px-6 mx-4 rounded-xl dark:bg-slate-600 bg-primary/10 relative">
                  {/* Image Section */}
                  <div className="mb-4">
                    <img src={data.img} alt={data.name} className="rounded-full w-20 h-20" />
                  </div>

                  {/* Content Section */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="space-y-3">
                      <p className="text-xs dark:text-slate-300 text-gray-500">{data.text}</p>
                      <h1 className="text-xl font-bold dark:text-slate-300 text-black/80">{data.name}</h1>
                    </div>
                  </div>

                  {/* Decorative Quote Mark */}
                  <p className="text-black/20 text-9xl font-serif absolute top-0 right-0">"</p>
                </div>
              </div>
            ))}
          </Slider>
        </div>
      </div>
    </div>
  );
};

export default Testimonials;
