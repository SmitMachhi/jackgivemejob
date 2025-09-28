import Image from "next/image";

export default function Home() {
  return (
    <main className="flex justify-center items-center h-screen">
      <div className="card bg-primary text-secondary-content w-96">
        <div className="card-body">
          <h2 className="card-title text-primary-content">
            daisyUI + Autumn Theme!
          </h2>
          <p className="text-primary-content">
            Your Next.js app is now styled with daisyUI using the autumn theme.
          </p>
          <div className="card-actions justify-end">
            <button className="btn">Get Started</button>
          </div>
        </div>
      </div>
    </main>
  );
}
