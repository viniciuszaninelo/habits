import * as Progress from '@radix-ui/react-progress';


interface ProgressBarProps {
  progress: number
}

export function ProgressBar(props: ProgressBarProps) {
  return (
    <div>
    <Progress.Root className='h-3 rounded-xl bg-zinc-700 w-full mt-4 transition-all'>
      <Progress.Indicator 
        aria-aria-valuenow={props.progress} 
        className='bg-violet-600 w-full h-full rounded-full transition-transform duration-[660ms] ease-[cubic-bezier(0.65, 0, 0.35, 1)]'
        style={{
          width: `${props.progress}%`
        }}
        />
    </Progress.Root>
    </div>
  )
}