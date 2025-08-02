import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, Mail, MessageCircle, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const faqItems = [
    {
      question: "How do I join a game?",
      answer: "Scan the QR code from the game creator or enter the game ID on the join page."
    },
    {
      question: "Can I play as a guest?",
      answer: "Yes! You can join games without signing up. Your progress will be saved temporarily."
    },
    {
      question: "How does scoring work?",
      answer: "Enter your strokes for each hole. The app calculates your total score automatically."
    },
    {
      question: "Can I share my achievements?",
      answer: "Yes! Take photos during your round and share your best moments with the community."
    },
    {
      question: "What's ParParty Premium?",
      answer: "Premium members get advanced stats, priority support, and exclusive features."
    }
  ];

  const supportOptions = [
    {
      icon: Mail,
      title: "Email Support",
      description: "Get help from our team",
      action: () => window.open('mailto:support@parparty.app', '_blank')
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Chat with us in real-time",
      action: () => alert('Live chat coming soon!')
    },
    {
      icon: Bug,
      title: "Report a Bug",
      description: "Help us improve the app",
      action: () => window.open('mailto:bugs@parparty.app?subject=Bug Report', '_blank')
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <Card className="bg-gray-900/95 backdrop-blur-xl border border-white/10 shadow-2xl">
              <CardHeader className="relative">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-white" />
                  </div>
                  <CardTitle className="text-white text-xl">Help & Support</CardTitle>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* FAQ Section */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Frequently Asked Questions</h3>
                  <div className="space-y-3">
                    {faqItems.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white/5 rounded-lg p-4 border border-white/10"
                      >
                        <h4 className="text-white font-medium mb-2">{item.question}</h4>
                        <p className="text-gray-400 text-sm">{item.answer}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Support Options */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Contact Support</h3>
                  <div className="grid gap-3">
                    {supportOptions.map((option, index) => {
                      const Icon = option.icon;
                      return (
                        <motion.button
                          key={index}
                          onClick={option.action}
                          className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors text-left"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="text-white font-medium">{option.title}</h4>
                            <p className="text-gray-400 text-sm">{option.description}</p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* App Info */}
                <div className="border-t border-white/10 pt-4">
                  <div className="text-center text-sm text-gray-400 space-y-1">
                    <p>ParParty Golf v1.0.0</p>
                    <p>Made with ❤️ for golfers everywhere</p>
                    <div className="flex justify-center gap-4 mt-3">
                      <button 
                        onClick={() => window.open('https://parparty.app/privacy', '_blank')}
                        className="text-cyan-400 hover:underline"
                      >
                        Privacy Policy
                      </button>
                      <button 
                        onClick={() => window.open('https://parparty.app/terms', '_blank')}
                        className="text-cyan-400 hover:underline"
                      >
                        Terms of Service
                      </button>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={onClose}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90"
                >
                  Close
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}