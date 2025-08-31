import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Sparkles, Camera, MapPin, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import bannerImg from '../assets/04.webp';
import bannerRoundImg from '../assets/19.webp';
import receptionBannerImg from '../assets/05.webp';
import receptionRoundImg from '../assets/18.webp';


const HeroSection: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  const [receptionTimeLeft, setReceptionTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  const [currentCard, setCurrentCard] = useState(0); // 0 for wedding, 1 for reception
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const weddingDate = new Date('2025-08-31T10:00:00');
    const receptionDate = new Date('2025-09-01T16:00:00');
    
    const timer = setInterval(() => {
      const now = new Date();
      
      // Wedding countdown
      const weddingDifference = weddingDate.getTime() - now.getTime();
      if (weddingDifference > 0) {
        setTimeLeft({
          days: Math.floor(weddingDifference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((weddingDifference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((weddingDifference / 1000 / 60) % 60),
          seconds: Math.floor((weddingDifference / 1000) % 60)
        });
      } else {
        // Wedding is complete, show confetti
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (currentCard === 0) {
          setShowConfetti(true);
        }
      }
      
      // Reception countdown
      const receptionDifference = receptionDate.getTime() - now.getTime();
      if (receptionDifference > 0) {
        setReceptionTimeLeft({
          days: Math.floor(receptionDifference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((receptionDifference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((receptionDifference / 1000 / 60) % 60),
          seconds: Math.floor((receptionDifference / 1000) % 60)
        });
      } else {
        // Reception is complete, show confetti
        setReceptionTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (currentCard === 1) {
          setShowConfetti(true);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentCard]);

  // Auto-hide confetti after 10 seconds
  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  // Trigger side cannon confetti when countdown reaches 0
  useEffect(() => {
    if (showConfetti) {
      // Side cannon effect from both sides
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 7,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          colors: ['#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e']
        });
        confetti({
          particleCount: 7,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          colors: ['#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [showConfetti]);

  // Auto-scroll between cards every 5 seconds
  useEffect(() => {
    const autoScroll = setInterval(() => {
      setCurrentCard(prev => prev === 0 ? 1 : 0);
    }, 15000);

    return () => clearInterval(autoScroll);
  }, []);

  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Share function for WhatsApp
  const shareInvitation = (cardType: string) => {
    let shareText = '';

    if (cardType === 'wedding') {
      shareText = `💌 You're Invited! 💌
We're tying the knot! 💍
August 31, 2025
Sunday • 10:00 AM - 11:00 AM

📍 GURUKRIPA Auditorium, Peruntattil

Check out our wedding invite & watch live photos here:`;
      
    } else {
      shareText = `💌 You're Invited! 💌
Join us for our Wedding Reception! 🎉
September 1, 2025
Monday • 4:00 PM onwards

📍 A.H. Palace, Mankara, Palakkad

Check out our wedding invite & watch live photos here:`;
    }
    
    // For mobile devices, try to use native sharing
    if (navigator.share) {
      navigator.share({
        title: 'Wedding Invitation',
        text: shareText,
        url: 'https://pradheesh-akshara-wed.vercel.app/'
      }).catch(console.error);
    } else {
      // Fallback to WhatsApp Web sharing
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  // Card data for wedding and reception
  const cardData = [
    {
      id: 0,
      type: 'wedding',
      bannerImg: bannerImg,
      roundImg: bannerRoundImg,
      quote: "I have found the one whom my soul loves",
      names: "Akshara & Pradheesh",
      subtitle: "Are Getting Married!",
      date: "August 31, 2025",
      time: "Sunday • 10:00 AM - 11:00 AM",
      venue: "GURUKRIPA Auditorium, Peruntattil",
      mapQuery: "GURUKRIPA+Auditorium,+Peruntattil",
      timeLeft: timeLeft,
      message: "Until We Say \"I Do\" 💕",
      linkText: "See Live Wedding Photos",
      linkSubtext: "Click to View — live wedding photos will appear here.",
      gradient: "from-amber-900/70 via-orange-900/60 to-yellow-900/70"
    },
    {
      id: 1,
      type: 'reception',
      bannerImg: receptionBannerImg,
      roundImg: receptionRoundImg,
      quote: "Celebrate with us as we start our new journey together",
      names: "Pradheesh & Akshara",
      subtitle: "Wedding Reception!",
      date: "September 1, 2025",
      time: "Monday • 4:00 PM onwards",
      venue: "A.H. Palace, Mankara, Palakkad",
      mapQuery: "A.H.+Palace+Mankara+Palakkad",
      timeLeft: receptionTimeLeft,
      message: "Until We Celebrate Together 🎉",
      linkText: "See Live Reception Photos",
      linkSubtext: "Join us for an evening of joy and celebration.",
      gradient: "from-emerald-900/70 via-green-900/60 to-teal-900/70"
    }
  ];

  const currentCardData = cardData[currentCard];

  return (
    <section id="home" className="min-h-screen relative overflow-hidden">
      {/* Full-width Banner Image */}
      <div className="absolute inset-0">
        <motion.img 
          key={currentCard}
          src={currentCardData.bannerImg}
          alt={`${currentCardData.names} ${currentCardData.type} Banner`} 
          className="w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />
        <div className={`absolute inset-0 bg-gradient-to-br ${currentCardData.gradient} opacity-5`}></div>
        <div className="absolute inset-0 bg-black/20"></div>
      </div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center">
      {/* Parallax Background */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-amber-100/20 via-orange-100/20 to-yellow-100/20"
          style={{ transform: `translateY(${scrollY * 0.5}px)` }}
        />
      
      {/* Background Animation */}
      <div className="absolute inset-0">
        {/* Mobile-optimized floating elements */}
        <motion.div
            className="absolute top-16 left-4 md:top-20 md:left-10 text-amber-300 text-2xl md:text-4xl"
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 5, -5, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{ transform: `translateY(${scrollY * 0.3}px)` }}
        >
          💕
        </motion.div>
        <motion.div
            className="absolute top-1/4 right-4 md:top-1/3 md:right-20 text-orange-300 text-xl md:text-3xl"
          animate={{ 
            y: [0, -15, 0],
            rotate: [0, -5, 5, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          style={{ transform: `translateY(${scrollY * 0.4}px)` }}
        >
          💝
        </motion.div>
        <motion.div
            className="absolute bottom-1/3 left-1/4 text-amber-200 text-lg md:text-2xl"
          animate={{ 
            y: [0, -10, 0],
            rotate: [0, 10, -10, 0],
            scale: [1, 1.15, 1]
          }}
          transition={{ 
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          style={{ transform: `translateY(${scrollY * 0.2}px)` }}
        >
          💖
        </motion.div>
        
        {/* Additional mobile elements */}
        <motion.div
          className="absolute top-1/2 left-8 text-yellow-300 text-lg md:text-xl"
          animate={{ 
            y: [0, -12, 0],
            rotate: [0, 15, -15, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{ 
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3
          }}
          style={{ transform: `translateY(${scrollY * 0.6}px)` }}
        >
          ✨
        </motion.div>
        
        <motion.div
          className="absolute bottom-1/4 right-8 text-orange-300 text-lg md:text-xl"
          animate={{ 
            y: [0, -8, 0],
            rotate: [0, -12, 12, 0],
            scale: [1, 1.25, 1]
          }}
          transition={{ 
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4
          }}
          style={{ transform: `translateY(${scrollY * 0.35}px)` }}
        >
          🌟
        </motion.div>
      </div>

        <div className="container mx-auto px-4 text-center" style={{ transform: `translateY(${scrollY * 0.1}px)` }}>
        <motion.div
          key={currentCard}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl md:rounded-3xl p-6 md:p-12 shadow-2xl max-w-4xl mx-auto border border-white/20"
        >
          {/* Couple Photo */}
          <motion.div
              className="w-40 h-40 md:w-64 md:h-64 mx-auto mb-6 md:mb-8 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center shadow-xl relative overflow-hidden border-4 border-white/30"
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <motion.img 
              key={`${currentCard}-round`}
                src={currentCardData.roundImg} 
              alt={currentCardData.names} 
              className="w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            />
              <div className="absolute inset-0 bg-gradient-to-t from-amber-900/30 to-transparent" />
            <motion.div 
              className="absolute top-2 right-2"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="h-6 w-6 text-yellow-300" />
            </motion.div>
          </motion.div>

          {/* Quote */}
          <motion.p
            key={`${currentCard}-quote`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
              className="text-base md:text-xl italic text-white mb-4 md:mb-6 font-serif px-2 drop-shadow-lg"
          >
            "{currentCardData.quote}"
          </motion.p>

          {/* Names */}
          <motion.div
            key={`${currentCard}-names`}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mb-6 md:mb-8"
          >
            <motion.h1 
                className="text-3xl md:text-6xl font-bold bg-gradient-to-r from-amber-200 to-orange-200 bg-clip-text text-transparent mb-3 md:mb-4 drop-shadow-lg"
              animate={{ 
                textShadow: [
                    "0 0 10px rgba(251, 191, 36, 0.3)",
                    "0 0 20px rgba(251, 191, 36, 0.5)",
                    "0 0 10px rgba(251, 191, 36, 0.3)"
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              {currentCardData.names}
            </motion.h1>
              <p className="text-lg md:text-2xl text-white font-light drop-shadow-lg">
              {currentCardData.subtitle}
            </p>
          </motion.div>

          {/* Event Date */}
          <motion.div
            key={`${currentCard}-date`}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mb-6 md:mb-8"
          >
              <div className="flex items-center justify-center space-x-2 text-xl md:text-3xl font-semibold text-white mb-2 drop-shadow-lg">
                <Calendar className="h-6 w-6 md:h-8 md:w-8 text-amber-300" />
              <span>{currentCardData.date}</span>
            </div>
              <p className="text-base md:text-lg text-white/90 drop-shadow-lg">{currentCardData.time}</p>
              <p className="text-base md:text-lg text-white/90 drop-shadow-lg">{currentCardData.venue}</p>
              
              {/* Map Button */}
              <motion.div
                className="mt-3"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.0 }}
              >
                <motion.button
                  onClick={() => {
                    const mapUrl = `https://maps.google.com/?q=${currentCardData.mapQuery}`;
                    window.open(mapUrl, '_blank');
                  }}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full shadow-md hover:bg-white/30 transition-all duration-300 border border-white/30"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm font-medium">View on Map</span>
                </motion.button>
              </motion.div>
          </motion.div>

          {/* Countdown Timer */}
          <motion.div
            key={`${currentCard}-timer`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="grid grid-cols-4 gap-2 md:gap-4 max-w-sm md:max-w-md mx-auto"
          >
            {[
              { label: 'Days', value: currentCardData.timeLeft.days },
              { label: 'Hours', value: currentCardData.timeLeft.hours },
              { label: 'Minutes', value: currentCardData.timeLeft.minutes },
              { label: 'Seconds', value: currentCardData.timeLeft.seconds }
            ].map((item) => (
              <motion.div
                key={item.label}
                  className="bg-white/20 backdrop-blur-sm rounded-lg md:rounded-xl p-2 md:p-4 shadow-lg border border-white/30"
                whileHover={{ scale: 1.05, rotateY: 10 }}
                whileTap={{ scale: 0.95 }}
              >
                  <div className="text-xl md:text-3xl font-bold text-amber-200 drop-shadow-lg">
                  {item.value.toString().padStart(2, '0')}
                </div>
                  <div className="text-xs md:text-base text-white/90 font-medium drop-shadow-lg">
                  {item.label}
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.p
            key={`${currentCard}-message`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
              className="mt-4 md:mt-6 text-base md:text-lg text-white/90 font-medium drop-shadow-lg"
          >
            {currentCardData.message}
          </motion.p>
          
          <div className="mt-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <motion.div
                className="inline-flex"
                whileHover={{ scale: 1.03, y: -3 }}
                whileTap={{ scale: 0.97 }}
              >
                <Link
                  to="/gallery"
                  className="inline-flex items-center space-x-3 px-5 py-3 bg-gradient-to-r from-pink-500 to-orange-500 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Camera className="h-5 w-5" />
                  <span>{currentCardData.linkText}</span>
                </Link>
              </motion.div>
              
              {/* Share Button */}
              <motion.div
                className="inline-flex"
                whileHover={{ scale: 1.03, y: -3 }}
                whileTap={{ scale: 0.97 }}
              >
                <button
                  onClick={() => shareInvitation(currentCardData.type)}
                  className="inline-flex items-center space-x-3 px-5 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Share2 className="h-5 w-5" />
                  <span>Share Invitation</span>
                </button>
              </motion.div>
            </div>
            <p className="text-sm text-white/80 mt-3">{currentCardData.linkSubtext}</p>
          </div>
          
          {/* Card Indicators */}
          <div className="flex justify-center space-x-2 mt-6">
            {cardData.map((_, index) => (
              <motion.div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  index === currentCard ? 'bg-white' : 'bg-white/50'
                }`}
                whileHover={{ scale: 1.2 }}
                onClick={() => setCurrentCard(index)}
              />
            ))}
          </div>
        </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;