"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import {
  TicketForm,
  type SupportTicketPayload,
} from "@/components/support/ticket-form";

export default function ContactPage() {
  const handleSubmitTicket = async (
    ticket: SupportTicketPayload,
  ): Promise<void> => {
    // No support API exists yet. Swap this for the real endpoint when it
    // lands — the form handles validation and feedback on its own.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log("Support ticket submitted:", ticket);
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(180deg, #212121 0%, #100F0F 100%)",
      }}
    >
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link href="/" className="inline-block">
            <Image
              src="/atisyn-logo.png"
              alt="Artisyn Logo"
              width={100}
              height={100}
              className="object-contain brightness-0 invert"
            />
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Get in Touch
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Have questions or need support? We&apos;re here to help you connect
            with trusted artisans.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Information */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-800 sticky top-8">
              <h2 className="text-2xl font-bold text-white mb-6">
                Contact Information
              </h2>

              <div className="space-y-6">
                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="bg-[#605DEC]/10 p-3 rounded-lg">
                    <Mail className="w-6 h-6 text-[#605DEC]" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Email Us</h3>
                    <p className="text-gray-400 text-sm mb-2">
                      For general inquiries and support
                    </p>
                    <a
                      href="mailto:support@artisyn.io"
                      className="text-[#605DEC] hover:underline text-sm"
                    >
                      support@artisyn.io
                    </a>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div className="bg-[#605DEC]/10 p-3 rounded-lg">
                    <Phone className="w-6 h-6 text-[#605DEC]" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Call Us</h3>
                    <p className="text-gray-400 text-sm mb-2">
                      Monday to Friday, 9AM - 6PM EST
                    </p>
                    <a
                      href="tel:+1234567890"
                      className="text-[#605DEC] hover:underline text-sm"
                    >
                      +1 (234) 567-890
                    </a>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-4">
                  <div className="bg-[#605DEC]/10 p-3 rounded-lg">
                    <MapPin className="w-6 h-6 text-[#605DEC]" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Office</h3>
                    <p className="text-gray-400 text-sm">
                      123 Artisan Street
                      <br />
                      Creative District, NY 10001
                    </p>
                  </div>
                </div>

                {/* Response Time */}
                <div className="flex items-start gap-4 pt-4 border-t border-gray-800">
                  <div className="bg-[#605DEC]/10 p-3 rounded-lg">
                    <Clock className="w-6 h-6 text-[#605DEC]" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">
                      Response Time
                    </h3>
                    <p className="text-gray-400 text-sm">
                      We typically respond within 24-48 hours during business
                      days.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-800">
              <h2 className="text-2xl font-bold text-white mb-2">
                Send Us a Message
              </h2>
              <p className="text-gray-400 mb-8">
                Give us a little context and we&apos;ll route your message to the
                right team. We&apos;ll get back to you within 24-48 hours.
              </p>

              <TicketForm
                variant="dark"
                onSubmit={handleSubmitTicket}
                submitLabel="Send Message"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
